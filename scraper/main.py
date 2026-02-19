"""
Bravo scraper orchestrator.
Scrapes Woolworths & Coles specials and/or full product catalogue,
archives history, and recomputes intelligence.

Usage:
    python -m scraper.main specials                # Both stores specials
    python -m scraper.main specials coles          # Coles specials only
    python -m scraper.main specials woolworths     # Woolworths specials only
    python -m scraper.main catalogue               # Both stores catalogue
    python -m scraper.main catalogue coles         # Coles catalogue only
    python -m scraper.main catalogue woolworths    # Woolworths catalogue only
    python -m scraper.main intel                   # Recompute intelligence only
    python -m scraper.main demo                    # Seed demo data
"""

import os
import sys
from datetime import date
from typing import List

from dotenv import load_dotenv
from supabase import create_client

from scraper.logger import get_logger, gha_error

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

log = get_logger("main")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

db = create_client(SUPABASE_URL, SUPABASE_KEY)

BATCH = 200


def _check_products_table() -> bool:
    """Verify the products table exists. Returns False with clear error if missing."""
    try:
        db.table("products").select("id").limit(1).execute()
        return True
    except Exception as e:
        if "PGRST205" in str(e) or "does not exist" in str(e):
            msg = (
                "Products table does not exist. "
                "Run the migration in supabase/migrations/003_products_catalogue.sql "
                "via the Supabase SQL Editor."
            )
            log.error(msg)
            gha_error(msg)
        else:
            log.error(f"Products table check failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Specials pipeline
# ---------------------------------------------------------------------------

def _upsert_specials(products: List[dict]):
    """Upsert scraped products into the specials table."""
    if not products:
        return

    today = str(date.today())
    rows = []
    for p in products:
        rows.append({
            "store": p["store"],
            "product_id": p["product_id"],
            "name": p["name"],
            "brand": p.get("brand"),
            "category": p.get("category"),
            "current_price": p["current_price"],
            "original_price": p.get("original_price"),
            "discount_pct": p.get("discount_pct"),
            "image_url": p.get("image_url"),
            "product_url": p.get("product_url"),
            "special_type": p.get("special_type"),
            "valid_from": today,
            "valid_to": None,
        })

    for i in range(0, len(rows), BATCH):
        db.table("specials").upsert(rows[i:i + BATCH], on_conflict="store,product_id").execute()

    log.info(f"Upserted {len(rows)} specials")


def _archive_expired(store: str, current_ids: set):
    """Move specials no longer on sale into special_history and delete from specials."""
    existing = (
        db.table("specials")
        .select("store,product_id,name,current_price,original_price,discount_pct,valid_from")
        .eq("store", store)
        .execute().data or []
    )

    expired = [s for s in existing if s["product_id"] not in current_ids]
    if not expired:
        log.info(f"No expired specials for {store}")
        return

    today = str(date.today())
    history_rows = []
    expired_keys = []
    for s in expired:
        history_rows.append({
            "store": s["store"],
            "product_id": s["product_id"],
            "name": s["name"],
            "current_price": s.get("current_price"),
            "original_price": s.get("original_price"),
            "discount_pct": s.get("discount_pct"),
            "first_seen": s.get("valid_from") or today,
            "last_seen": today,
        })
        expired_keys.append(s["product_id"])

    if history_rows:
        for i in range(0, len(history_rows), BATCH):
            db.table("special_history").insert(history_rows[i:i + BATCH]).execute()

    for pid in expired_keys:
        db.table("specials").delete().eq("store", store).eq("product_id", pid).execute()

    log.info(f"Archived {len(expired)} expired {store} specials to history")


def _record_current_to_history(products: List[dict]):
    """Record currently active specials in history (batch approach)."""
    today = str(date.today())

    all_history = (
        db.table("special_history")
        .select("id,store,product_id,first_seen,last_seen")
        .order("last_seen", desc=True)
        .execute().data or []
    )

    latest_by_key = {}
    for h in all_history:
        key = (h["store"], h["product_id"])
        if key not in latest_by_key:
            latest_by_key[key] = h

    to_update = []
    to_insert = []

    for p in products:
        key = (p["store"], p["product_id"])
        existing = latest_by_key.get(key)
        if existing:
            to_update.append(existing["id"])
        else:
            to_insert.append({
                "store": p["store"],
                "product_id": p["product_id"],
                "name": p["name"],
                "current_price": p.get("current_price"),
                "original_price": p.get("original_price"),
                "discount_pct": p.get("discount_pct"),
                "first_seen": today,
                "last_seen": today,
            })

    if to_update:
        for i in range(0, len(to_update), 50):
            batch_ids = to_update[i:i + 50]
            db.table("special_history").update({"last_seen": today}).in_("id", batch_ids).execute()
        log.info(f"Updated last_seen on {len(to_update)} history rows")

    if to_insert:
        for i in range(0, len(to_insert), BATCH):
            db.table("special_history").insert(to_insert[i:i + BATCH]).execute()
        log.info(f"Inserted {len(to_insert)} new history rows")


def _recompute_intel(products: List[dict]):
    """Recompute special_intel for all products we just scraped."""
    from scraper.intelligence import compute_intel

    current_keys = {(p["store"], p["product_id"]) for p in products}
    product_map = {(p["store"], p["product_id"]): p for p in products}

    all_history = db.table("special_history").select("*").execute().data or []

    history_by_key = {}
    for h in all_history:
        key = (h["store"], h["product_id"])
        history_by_key.setdefault(key, []).append(h)

    intel_rows = []
    processed_keys = set()

    for key in current_keys:
        hist = history_by_key.get(key, [])
        p = product_map[key]
        intel = compute_intel(hist, is_on_special_now=True, current_discount=p.get("discount_pct"))
        intel["store"] = key[0]
        intel["product_id"] = key[1]
        intel["name"] = p["name"]
        intel["category"] = p.get("category")
        intel["image_url"] = p.get("image_url")
        intel_rows.append(intel)
        processed_keys.add(key)

    for key, hist in history_by_key.items():
        if key in processed_keys:
            continue
        last_entry = max(hist, key=lambda h: h.get("last_seen", ""))
        intel = compute_intel(hist, is_on_special_now=False)
        intel["store"] = key[0]
        intel["product_id"] = key[1]
        intel["name"] = last_entry.get("name", "")
        intel["category"] = None
        intel["image_url"] = None
        intel_rows.append(intel)

    if intel_rows:
        for i in range(0, len(intel_rows), BATCH):
            db.table("special_intel").upsert(
                intel_rows[i:i + BATCH], on_conflict="store,product_id"
            ).execute()

    log.info(
        f"Intel updated: {len(intel_rows)} products "
        f"({len(current_keys)} on special, {len(intel_rows) - len(current_keys)} historical)"
    )


# ---------------------------------------------------------------------------
# Catalogue pipeline
# ---------------------------------------------------------------------------

def _upsert_products(products: List[dict]):
    """Upsert catalogue products into the products table."""
    if not products:
        return

    today = str(date.today())
    rows = []
    for p in products:
        rows.append({
            "store": p["store"],
            "product_id": p["product_id"],
            "name": p["name"],
            "brand": p.get("brand"),
            "category": p.get("category"),
            "regular_price": p["current_price"],
            "image_url": p.get("image_url"),
            "product_url": p.get("product_url"),
            "last_seen": today,
        })

    for i in range(0, len(rows), BATCH):
        db.table("products").upsert(rows[i:i + BATCH], on_conflict="store,product_id").execute()

    log.info(f"Upserted {len(rows)} catalogue products")


def _compute_never_on_special_intel():
    """Find catalogue products that have NEVER been on special and add to intel."""
    from scraper.intelligence import compute_intel

    log.info("Computing 'never on special' intel ...")

    all_products = db.table("products").select("store,product_id,name,category,image_url").execute().data or []
    existing_intel = db.table("special_intel").select("store,product_id").execute().data or []

    intel_keys = {(r["store"], r["product_id"]) for r in existing_intel}

    never_products = [
        p for p in all_products
        if (p["store"], p["product_id"]) not in intel_keys
    ]

    if not never_products:
        log.info("No new 'never on special' products to add")
        return

    intel_rows = []
    for p in never_products:
        intel = compute_intel([], is_on_special_now=False)
        intel["store"] = p["store"]
        intel["product_id"] = p["product_id"]
        intel["name"] = p["name"]
        intel["category"] = p.get("category")
        intel["image_url"] = p.get("image_url")
        intel["frequency_class"] = "never"
        intel_rows.append(intel)

    for i in range(0, len(intel_rows), BATCH):
        db.table("special_intel").upsert(
            intel_rows[i:i + BATCH], on_conflict="store,product_id"
        ).execute()

    log.info(f"Added {len(intel_rows)} 'never on special' products to intel")


# ---------------------------------------------------------------------------
# Entrypoints
# ---------------------------------------------------------------------------

def run_specials(stores=None):
    """Execute the full specials scrape pipeline."""
    if stores is None:
        stores = ["coles", "woolworths"]

    all_products = []

    if "coles" in stores:
        log.info("=== COLES SPECIALS ===")
        from scraper.coles import scrape_coles
        coles_products = scrape_coles(max_pages=200)
        if coles_products:
            _upsert_specials(coles_products)
            coles_ids = {p["product_id"] for p in coles_products}
            _archive_expired("coles", coles_ids)
            all_products.extend(coles_products)

    if "woolworths" in stores:
        log.info("=== WOOLWORTHS SPECIALS ===")
        from scraper.woolworths import scrape_woolworths
        woolworths_products = scrape_woolworths(max_pages_per_category=50)
        if woolworths_products:
            _upsert_specials(woolworths_products)
            woolworths_ids = {p["product_id"] for p in woolworths_products}
            _archive_expired("woolworths", woolworths_ids)
            all_products.extend(woolworths_products)

    if all_products:
        log.info("=== RECORDING HISTORY & INTEL ===")
        _record_current_to_history(all_products)
        _recompute_intel(all_products)

    log.info(f"=== SPECIALS COMPLETE: {len(all_products)} total products ===")
    return all_products


def run_catalogue(stores=None):
    """Execute the catalogue scrape pipeline."""
    if not _check_products_table():
        sys.exit(1)

    if stores is None:
        stores = ["coles", "woolworths"]

    all_products = []

    if "coles" in stores:
        log.info("=== COLES CATALOGUE ===")
        from scraper.coles import scrape_coles_catalogue
        coles_products = scrape_coles_catalogue()
        if coles_products:
            _upsert_products(coles_products)
            all_products.extend(coles_products)

    if "woolworths" in stores:
        log.info("=== WOOLWORTHS CATALOGUE ===")
        from scraper.woolworths import scrape_woolworths_catalogue
        woolworths_products = scrape_woolworths_catalogue()
        if woolworths_products:
            _upsert_products(woolworths_products)
            all_products.extend(woolworths_products)

    if all_products:
        _compute_never_on_special_intel()

    log.info(f"=== CATALOGUE COMPLETE: {len(all_products)} total products ===")
    return all_products


def run_intel():
    """Recompute all intelligence (specials + never-on-special)."""
    log.info("=== RECOMPUTING ALL INTEL ===")

    all_specials = db.table("specials").select("*").execute().data or []
    products = [{
        "store": s["store"],
        "product_id": s["product_id"],
        "name": s["name"],
        "category": s.get("category"),
        "image_url": s.get("image_url"),
        "current_price": s.get("current_price"),
        "original_price": s.get("original_price"),
        "discount_pct": s.get("discount_pct"),
    } for s in all_specials]

    if products:
        _recompute_intel(products)

    _compute_never_on_special_intel()
    log.info("=== INTEL RECOMPUTE COMPLETE ===")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scraper.main [specials|catalogue|intel|demo] [coles|woolworths]")
        sys.exit(1)

    command = sys.argv[1]
    stores = [sys.argv[2]] if len(sys.argv) > 2 else None

    try:
        if command == "specials":
            run_specials(stores)
        elif command == "catalogue":
            run_catalogue(stores)
        elif command == "intel":
            run_intel()
        elif command == "demo":
            from scraper.seed_demo import run as seed_demo
            seed_demo()
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    except Exception as e:
        log.error(f"Fatal error: {e}", exc_info=True)
        gha_error(f"Scraper failed: {e}")
        sys.exit(1)
