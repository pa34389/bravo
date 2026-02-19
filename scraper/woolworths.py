"""
Woolworths scraper.
Uses Playwright (stealth mode) to establish a session, then calls the browse API
with pagination to fetch specials and/or full catalogue.
"""

import json
import os
from typing import List, Optional

from scraper.logger import get_logger, gha_warning, gha_error
from scraper.stealth import (
    stealth_delay,
    session_break,
    create_stealth_context,
    bot_challenge_detected,
)

log = get_logger("woolworths")

IMAGE_CDN = "https://cdn0.woolworths.media/content/wowproductimages/medium"
BASE_URL = "https://www.woolworths.com.au"

SPECIALS_CATEGORIES = [
    {"id": "specialsgroup.3676", "name": "Half Price", "url": "/shop/browse/specials/half-price"},
    {"id": "specialsgroup.3694", "name": "Lower Shelf Price", "url": "/shop/browse/specials/lower-prices"},
]

CATALOGUE_CATEGORIES = [
    {"id": "1-E5BEE36E", "name": "Fruit & Veg", "url": "/shop/browse/fruit-veg"},
    {"id": "1_D5A2236", "name": "Meat, Seafood & Deli", "url": "/shop/browse/meat-seafood-deli"},
    {"id": "1_6E4F4E4", "name": "Dairy, Eggs & Fridge", "url": "/shop/browse/dairy-eggs-fridge"},
    {"id": "1_39FD49C", "name": "Pantry", "url": "/shop/browse/pantry"},
    {"id": "1_5AF3A0A", "name": "Drinks", "url": "/shop/browse/drinks"},
    {"id": "1_2432B58", "name": "Household", "url": "/shop/browse/household"},
]

_GROCERY_DEPARTMENTS = {
    "GROCERIES", "FRESH PRODUCE", "FRUIT AND VEG", "MEAT", "DAIRY", "FROZEN",
    "DELI", "BAKERY", "HEALTH & BEAUTY", "BABY", "PET",
    "DRINKS", "LIQUOR", "PANTRY", "HOUSEHOLD", "LONG LIFE",
    "SEAFOOD", "POULTRY", "SMALLGOODS",
}

SESSION_BREAK_EVERY = 10  # pages between session breaks


def _parse_product(p: dict, category_name: str) -> Optional[dict]:
    """Parse a single Woolworths product from the browse API response.
    Returns None for marketplace/third-party items.
    """
    if p.get("IsMarketProduct") or p.get("Vendor") or p.get("ThirdPartyProductInfo"):
        return None

    price = p.get("Price")
    if price is None:
        return None

    attrs = p.get("AdditionalAttributes") or {}
    sap_dept = (attrs.get("sapdepartmentname") or "").strip().upper()
    if sap_dept and sap_dept not in _GROCERY_DEPARTMENTS:
        return None

    was_price = p.get("WasPrice")
    savings = p.get("SavingsAmount", 0) or 0
    discount_pct = 0
    if was_price and was_price > 0 and savings > 0:
        discount_pct = round((savings / was_price) * 100)

    is_half = p.get("IsHalfPrice", False)
    special_type = "half-price" if is_half else "reduced" if p.get("IsOnSpecial") else None

    stockcode = p.get("Stockcode")
    image_url = p.get("MediumImageFile")
    if not image_url and stockcode:
        image_url = f"{IMAGE_CDN}/{stockcode}.jpg"

    category = _extract_category(attrs) or category_name
    brand = p.get("Brand")

    return {
        "store": "woolworths",
        "product_id": str(stockcode or ""),
        "name": p.get("DisplayName") or p.get("Name", ""),
        "brand": brand,
        "category": category,
        "current_price": float(price),
        "original_price": float(was_price) if was_price and was_price > 0 else None,
        "discount_pct": discount_pct if discount_pct > 0 else None,
        "image_url": image_url,
        "product_url": f"{BASE_URL}/shop/productdetails/{stockcode}" if stockcode else None,
        "special_type": special_type,
        "size": p.get("PackageSize"),
    }


def _extract_category(attrs: dict) -> Optional[str]:
    """Extract a human-readable category from Woolworths AdditionalAttributes."""
    pies_json = attrs.get("piesdepartmentnamesjson")
    if pies_json:
        try:
            depts = json.loads(pies_json)
            if depts and isinstance(depts, list):
                return str(depts[0])
        except (ValueError, TypeError, IndexError):
            pass

    sap_cat = attrs.get("sapcategoryname")
    if sap_cat:
        return sap_cat.strip().title()

    sap_dept = attrs.get("sapdepartmentname")
    if sap_dept:
        return sap_dept.strip().title()

    return None


def _fetch_browse_page(page, category: dict, page_num: int, is_special: bool) -> Optional[dict]:
    """Call the Woolworths browse API for a single page."""
    cat_id = category["id"]
    cat_name = category["name"]
    cat_url = category["url"]

    js = f"""
    (async () => {{
        const r = await fetch("/apis/ui/browse/category", {{
            method: "POST",
            credentials: "include",
            headers: {{"Content-Type": "application/json", "Accept": "application/json"}},
            body: JSON.stringify({{
                categoryId: "{cat_id}",
                pageNumber: {page_num},
                pageSize: 36,
                sortType: "TraderRelevance",
                url: "{cat_url}",
                isSpecial: {str(is_special).lower()},
                isBundle: false,
                formatObject: '{{"name":"{cat_name}"}}'
            }})
        }});
        const t = await r.text();
        return {{status: r.status, body: t}};
    }})()
    """

    try:
        result = page.evaluate(js)
    except Exception as e:
        log.error(f"{cat_name} page {page_num}: evaluate error: {e}")
        return None

    if result.get("status") != 200:
        log.warning(f"{cat_name} page {page_num}: HTTP {result.get('status')}")
        return None

    try:
        return json.loads(result["body"])
    except json.JSONDecodeError:
        log.error(f"{cat_name} page {page_num}: invalid JSON response")
        return None


def _scrape_category(
    page, category: dict, max_pages: int,
    is_special: bool = True,
    delay_min: float = 30.0, delay_max: float = 90.0,
) -> List[dict]:
    """Scrape all products in a category using the browse API with stealth delays."""
    products = []
    seen_ids: set = set()
    cat_name = category["name"]
    pages_since_break = 0

    for page_num in range(1, max_pages + 1):
        data = _fetch_browse_page(page, category, page_num, is_special)
        if data is None:
            break

        total = data.get("TotalRecordCount", 0)
        bundles = data.get("Bundles", [])

        new_count = 0
        for bundle in bundles:
            for raw_product in bundle.get("Products", []):
                parsed = _parse_product(raw_product, cat_name)
                if parsed and parsed["product_id"] not in seen_ids:
                    seen_ids.add(parsed["product_id"])
                    products.append(parsed)
                    new_count += 1

        log.info(f"{cat_name} p{page_num}: +{new_count} ({len(products)}/{total})")

        if len(products) >= total or new_count == 0:
            break

        if page_num < max_pages:
            pages_since_break += 1
            if pages_since_break >= SESSION_BREAK_EVERY:
                session_break(2.0, 5.0, label=f"{cat_name} session break")
                pages_since_break = 0
            else:
                stealth_delay(delay_min, delay_max, label=f"{cat_name} p{page_num}")

    return products


def _launch_browser_and_session(playwright, session_url: str):
    """Launch a stealth browser and establish a Woolworths session."""
    use_headless = os.environ.get("WOOLWORTHS_HEADLESS", "").lower() == "true"

    browser = playwright.chromium.launch(
        channel="chrome" if not use_headless else None,
        headless=use_headless,
        args=["--disable-blink-features=AutomationControlled"],
    )
    ctx = create_stealth_context(browser)
    page = ctx.new_page()

    log.info(f"Establishing session via {session_url} ...")
    page.goto(f"{BASE_URL}{session_url}", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(6000)

    if bot_challenge_detected(page):
        log.error("BLOCKED by Woolworths. Try again later.")
        gha_error("Woolworths scraper blocked by bot detection")
        browser.close()
        return None, None, None

    log.info(f"Session established. Page: {page.title()}")
    return browser, ctx, page


def scrape_woolworths(max_pages_per_category: int = 50) -> List[dict]:
    """Scrape Woolworths specials with stealth delays."""
    from playwright.sync_api import sync_playwright

    all_products = []
    seen_ids: set = set()

    with sync_playwright() as p:
        browser, ctx, page = _launch_browser_and_session(
            p, "/shop/browse/specials/half-price"
        )
        if not browser:
            return []

        for category in SPECIALS_CATEGORIES:
            log.info(f"Scraping specials: {category['name']} ...")
            cat_products = _scrape_category(
                page, category, max_pages_per_category,
                is_special=True, delay_min=30.0, delay_max=90.0,
            )
            for cp in cat_products:
                if cp["product_id"] not in seen_ids:
                    seen_ids.add(cp["product_id"])
                    all_products.append(cp)

            if category != SPECIALS_CATEGORIES[-1]:
                session_break(1.0, 3.0, label="between specials categories")

        browser.close()

    log.info(f"Specials done: {len(all_products)} products")
    return all_products


def scrape_woolworths_catalogue(
    categories: Optional[List[dict]] = None,
    max_pages_per_category: int = 100,
) -> List[dict]:
    """Scrape full product catalogue for the given categories."""
    from playwright.sync_api import sync_playwright

    if categories is None:
        categories = CATALOGUE_CATEGORIES

    all_products = []
    seen_ids: set = set()

    with sync_playwright() as p:
        first_url = categories[0]["url"] if categories else "/shop/browse/pantry"
        browser, ctx, page = _launch_browser_and_session(p, first_url)
        if not browser:
            return []

        for i, category in enumerate(categories):
            log.info(f"Catalogue [{i+1}/{len(categories)}]: {category['name']} ...")
            cat_products = _scrape_category(
                page, category, max_pages_per_category,
                is_special=False, delay_min=45.0, delay_max=120.0,
            )
            for cp in cat_products:
                if cp["product_id"] not in seen_ids:
                    seen_ids.add(cp["product_id"])
                    all_products.append(cp)

            log.info(f"  {category['name']}: {len(cat_products)} products")

            if i < len(categories) - 1:
                session_break(3.0, 7.0, label=f"between categories ({category['name']})")

        browser.close()

    log.info(f"Catalogue done: {len(all_products)} products across {len(categories)} categories")
    return all_products


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "specials"
    if mode == "catalogue":
        products = scrape_woolworths_catalogue(max_pages_per_category=2)
    else:
        products = scrape_woolworths(max_pages_per_category=2)
    print(f"\nGot {len(products)} products")
    for p in products[:5]:
        print(f"  {p['name']} | ${p['current_price']} (was ${p.get('original_price', 'N/A')})")
