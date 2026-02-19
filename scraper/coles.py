"""
Coles scraper.
Specials: curl + __NEXT_DATA__ parsing (lightweight, proven).
Catalogue: Playwright + __NEXT_DATA__ extraction (handles JS bot challenges).
"""

import json
import os
import re
import random
import subprocess
import time
from typing import List, Optional, Tuple

from scraper.logger import get_logger, gha_warning, gha_error
from scraper.stealth import (
    stealth_delay,
    session_break,
    pick_user_agent,
    create_stealth_context,
    bot_challenge_detected,
)

log = get_logger("coles")

BASE_URL = "https://www.coles.com.au"
SPECIALS_URL = f"{BASE_URL}/on-special"
IMAGE_CDN = "https://cdn.productimages.coles.com.au/productimages"

NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.DOTALL
)

CATALOGUE_CATEGORIES = [
    {"slug": "fruit-vegetables", "name": "Fruit & Vegetables"},
    {"slug": "meat-seafood", "name": "Meat & Seafood"},
    {"slug": "dairy-eggs-fridge", "name": "Dairy, Eggs & Fridge"},
    {"slug": "pantry", "name": "Pantry"},
    {"slug": "drinks", "name": "Drinks"},
    {"slug": "household", "name": "Household"},
]

BOT_BACKOFF_SECONDS = 600  # 10 minutes


# ---------------------------------------------------------------------------
# Shared parsers
# ---------------------------------------------------------------------------

def _parse_next_data(html: str) -> Optional[dict]:
    match = NEXT_DATA_RE.search(html)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def _extract_products(nd: dict) -> Tuple[List[dict], int]:
    """Extract product list and total count from __NEXT_DATA__."""
    search = nd.get("props", {}).get("pageProps", {}).get("searchResults", {})
    total = search.get("noOfResults", 0)
    raw_results = search.get("results", [])

    products = []
    for r in raw_results:
        if r.get("_type") != "PRODUCT":
            continue

        pricing = r.get("pricing", {})
        now_price = pricing.get("now")
        if now_price is None:
            continue

        was_price = pricing.get("was")
        save_amount = pricing.get("saveAmount", 0) or 0
        discount_pct = 0
        if was_price and was_price > 0 and save_amount > 0:
            discount_pct = round((save_amount / was_price) * 100)

        promo = pricing.get("promotionType", "")
        special_type = "half-price" if discount_pct >= 48 else "reduced" if promo else None

        image_uri = None
        image_list = r.get("imageUris", [])
        if image_list:
            uri = image_list[0].get("uri", "")
            if uri:
                image_uri = f"{IMAGE_CDN}{uri}"

        heirs = r.get("onlineHeirs", [])
        category = None
        if heirs and isinstance(heirs[0], dict):
            category = heirs[0].get("subCategory") or heirs[0].get("category")

        products.append({
            "store": "coles",
            "product_id": str(r.get("id", "")),
            "name": r.get("name", ""),
            "brand": r.get("brand"),
            "category": category,
            "current_price": float(now_price),
            "original_price": float(was_price) if was_price and was_price > 0 else None,
            "discount_pct": discount_pct if discount_pct > 0 else None,
            "image_url": image_uri,
            "product_url": f"{BASE_URL}/product/{r.get('id', '')}",
            "special_type": special_type,
            "size": r.get("size"),
        })

    return products, total


# ---------------------------------------------------------------------------
# Specials scraper (curl-based, proven approach)
# ---------------------------------------------------------------------------

def _fetch_page_curl(url: str, cookie_jar: str, user_agent: str) -> Optional[str]:
    """Fetch a page using curl with persistent cookies."""
    try:
        result = subprocess.run(
            [
                "curl", "-s", "-L",
                "--cookie", cookie_jar,
                "--cookie-jar", cookie_jar,
                "-H", f"User-Agent: {user_agent}",
                "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "-H", "Accept-Language: en-AU,en;q=0.9",
                "-H", "Accept-Encoding: identity",
                "-H", "Connection: keep-alive",
                "-H", f"Referer: {BASE_URL}/on-special",
                url,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return result.stdout
        return None
    except Exception as e:
        log.error(f"curl error: {e}")
        return None


def scrape_coles(max_pages: int = 200) -> List[dict]:
    """Scrape Coles specials via curl + __NEXT_DATA__."""
    import tempfile
    cookie_jar = os.path.join(tempfile.gettempdir(), "coles_cookies.txt")
    user_agent = pick_user_agent()

    all_products = []
    seen_ids: set = set()
    consecutive_failures = 0

    log.info("Establishing session ...")
    _fetch_page_curl(f"{BASE_URL}/on-special", cookie_jar, user_agent)
    stealth_delay(3, 6, "session warmup")

    for page_num in range(1, max_pages + 1):
        url = SPECIALS_URL if page_num == 1 else f"{SPECIALS_URL}?page={page_num}"

        html = _fetch_page_curl(url, cookie_jar, user_agent)
        if not html:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                log.error("3 consecutive fetch failures, stopping")
                gha_warning("Coles specials: 3 consecutive failures")
                break
            stealth_delay(5, 10, "retry backoff")
            continue

        if "Pardon Our Interruption" in html:
            log.warning(f"Bot challenge on page {page_num}. Backing off {BOT_BACKOFF_SECONDS}s ...")
            gha_warning(f"Coles bot challenge on page {page_num}")
            time.sleep(BOT_BACKOFF_SECONDS)
            consecutive_failures += 1
            if consecutive_failures >= 3:
                log.error("Blocked after retries, stopping")
                gha_error("Coles specials blocked by bot detection")
                break
            continue

        nd = _parse_next_data(html)
        if not nd:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                log.error("3 consecutive parse failures, stopping")
                break
            log.warning(f"Page {page_num}: no __NEXT_DATA__, backing off ...")
            stealth_delay(5 * consecutive_failures, 10 * consecutive_failures, "parse backoff")
            continue

        consecutive_failures = 0
        products, total = _extract_products(nd)

        new_count = 0
        for p in products:
            if p["product_id"] not in seen_ids:
                seen_ids.add(p["product_id"])
                all_products.append(p)
                new_count += 1

        log.info(f"Specials p{page_num}: +{new_count} ({len(all_products)}/{total})")

        if len(all_products) >= total or new_count == 0:
            break

        stealth_delay(30, 75, f"specials p{page_num}")

    log.info(f"Specials done: {len(all_products)} products")
    return all_products


# ---------------------------------------------------------------------------
# Catalogue scraper (Playwright-based, handles JS bot challenges)
# ---------------------------------------------------------------------------

def _extract_next_data_from_page(page) -> Optional[dict]:
    """Extract __NEXT_DATA__ from the Playwright page DOM."""
    try:
        nd_text = page.evaluate(
            "document.getElementById('__NEXT_DATA__')?.textContent || null"
        )
        if nd_text:
            return json.loads(nd_text)
    except Exception as e:
        log.error(f"__NEXT_DATA__ extraction failed: {e}")
    return None


def _scrape_catalogue_category(page, category: dict, max_pages: int) -> List[dict]:
    """Scrape a single Coles browse category using Playwright."""
    slug = category["slug"]
    name = category["name"]
    all_products = []
    seen_ids: set = set()

    browse_url = f"{BASE_URL}/browse/{slug}"
    log.info(f"Loading {name} ({browse_url}) ...")

    page.goto(browse_url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(8000)

    if bot_challenge_detected(page):
        log.warning(f"{name}: bot challenge. Waiting {BOT_BACKOFF_SECONDS}s ...")
        time.sleep(BOT_BACKOFF_SECONDS)
        page.reload(wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(8000)
        if bot_challenge_detected(page):
            log.error(f"{name}: still blocked after backoff")
            gha_error(f"Coles catalogue blocked for {name}")
            return []

    # Page 1: extract from __NEXT_DATA__ (available on SSR page load)
    nd = _extract_next_data_from_page(page)
    if not nd:
        log.error(f"{name}: no __NEXT_DATA__ on page 1")
        return []

    products, total = _extract_products(nd)
    for p in products:
        if p["product_id"] not in seen_ids:
            seen_ids.add(p["product_id"])
            all_products.append(p)

    log.info(f"{name} p1: +{len(all_products)} ({len(all_products)}/{total})")

    if total <= len(products):
        return all_products

    # Pages 2+: click pagination links and intercept _next/data responses
    for page_num in range(2, max_pages + 1):
        if len(all_products) >= total:
            break

        stealth_delay(45, 120, f"{name} p{page_num}")

        # Scroll to bottom to reveal pagination
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1500)

        # Set up response interception for the data fetch
        captured_data = []

        def capture_response(response):
            url = response.url
            if "_next/data" in url and response.status == 200:
                try:
                    body = response.json()
                    if body.get("pageProps", {}).get("searchResults"):
                        captured_data.append(body)
                except Exception:
                    pass

        page.on("response", capture_response)

        # Click the next page link
        next_href = f"/browse/{slug}?page={page_num}"
        clicked = page.evaluate(f"""() => {{
            const link = document.querySelector('a[href="{next_href}"]');
            if (link) {{ link.click(); return true; }}
            const next = document.querySelector('a[aria-label="Go to next page"]');
            if (next) {{ next.click(); return true; }}
            return false;
        }}""")

        if not clicked:
            log.warning(f"{name} p{page_num}: no pagination link found, stopping")
            page.remove_listener("response", capture_response)
            break

        page.wait_for_timeout(6000)
        page.remove_listener("response", capture_response)

        if captured_data:
            # Use intercepted _next/data response
            nd_page = captured_data[-1]
            products_page, _ = _extract_products(nd_page)
        else:
            # Fallback: try __NEXT_DATA__ from DOM (may be stale)
            # Second fallback: extract product tiles from rendered DOM
            products_page = _extract_products_from_dom(page)

        new_count = 0
        for p in products_page:
            if p["product_id"] not in seen_ids:
                seen_ids.add(p["product_id"])
                all_products.append(p)
                new_count += 1

        log.info(f"{name} p{page_num}: +{new_count} ({len(all_products)}/{total})")

        if new_count == 0:
            log.warning(f"{name} p{page_num}: no new products, stopping")
            break

        if page_num % SESSION_BREAK_EVERY == 0:
            session_break(2.0, 5.0, label=f"{name} session break")

    return all_products


SESSION_BREAK_EVERY = 10


def _extract_products_from_dom(page) -> List[dict]:
    """Fallback: extract product data directly from rendered DOM tiles."""
    try:
        raw = page.evaluate("""() => {
            const products = [];
            const links = document.querySelectorAll('a[href*="/product/"]');
            const seen = new Set();
            for (const link of links) {
                const href = link.getAttribute('href') || '';
                const idMatch = href.match(/\\/product\\/(\\d+)/);
                if (!idMatch || seen.has(idMatch[1])) continue;
                seen.add(idMatch[1]);

                const tile = link.closest('section, article, [class*="tile"], [class*="card"]') || link;
                const text = tile.innerText || '';
                const img = tile.querySelector('img');

                // Try to extract price from text
                const priceMatch = text.match(/\\$([\\d.]+)/);
                const nameEl = tile.querySelector('h3, h4, [class*="name"], [class*="title"]');

                products.push({
                    id: idMatch[1],
                    name: nameEl ? nameEl.innerText.trim() : text.split('\\n')[0]?.trim() || '',
                    price: priceMatch ? parseFloat(priceMatch[1]) : null,
                    image: img ? img.getAttribute('src') : null,
                    href: href,
                });
            }
            return products;
        }""")

        return [{
            "store": "coles",
            "product_id": str(r["id"]),
            "name": r["name"],
            "brand": None,
            "category": None,
            "current_price": r["price"],
            "original_price": None,
            "discount_pct": None,
            "image_url": r.get("image"),
            "product_url": f"{BASE_URL}{r['href']}" if r.get("href") else None,
            "special_type": None,
            "size": None,
        } for r in raw if r.get("price") is not None]

    except Exception as e:
        log.error(f"DOM extraction failed: {e}")
        return []


def scrape_coles_catalogue(
    categories: Optional[List[dict]] = None,
    max_pages_per_category: int = 200,
) -> List[dict]:
    """Scrape full product catalogue for given Coles categories via Playwright."""
    from playwright.sync_api import sync_playwright

    if categories is None:
        categories = CATALOGUE_CATEGORIES

    all_products = []
    seen_ids: set = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome" if not os.environ.get("COLES_HEADLESS") else None,
            headless=bool(os.environ.get("COLES_HEADLESS")),
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = create_stealth_context(browser)
        page = ctx.new_page()

        for i, category in enumerate(categories):
            log.info(f"Catalogue [{i+1}/{len(categories)}]: {category['name']} ...")
            cat_products = _scrape_catalogue_category(page, category, max_pages_per_category)

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
        products = scrape_coles_catalogue(max_pages_per_category=2)
    else:
        products = scrape_coles(max_pages=3)
    print(f"\nGot {len(products)} products")
    for p in products[:5]:
        print(f"  {p.get('brand', '')} {p['name']} | ${p['current_price']}")
