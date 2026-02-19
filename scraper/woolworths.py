"""
Woolworths specials scraper.
Uses Playwright (stealth mode) to establish a session, then calls the browse API
with pagination to fetch all specials.
"""

import json
import os
from typing import List, Optional

IMAGE_CDN = "https://cdn0.woolworths.media/content/wowproductimages/medium"
BASE_URL = "https://www.woolworths.com.au"

SPECIALS_CATEGORIES = [
    {"id": "specialsgroup.3676", "name": "Half Price", "url": "/shop/browse/specials/half-price"},
    {"id": "specialsgroup.3694", "name": "Lower Shelf Price", "url": "/shop/browse/specials/lower-prices"},
]


def _parse_product(p: dict, specials_group_name: str) -> Optional[dict]:
    """Parse a single Woolworths product from the browse API response.
    Returns None for marketplace/third-party items.
    """
    if p.get("IsMarketProduct"):
        return None
    if p.get("Vendor"):
        return None
    if p.get("ThirdPartyProductInfo"):
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

    category = _extract_category(attrs) or specials_group_name
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


_GROCERY_DEPARTMENTS = {
    "GROCERIES", "FRESH PRODUCE", "MEAT", "DAIRY", "FROZEN",
    "DELI", "BAKERY", "HEALTH & BEAUTY", "BABY", "PET",
    "DRINKS", "LIQUOR", "PANTRY", "HOUSEHOLD",
}


def _extract_category(attrs: dict) -> Optional[str]:
    """Extract a human-readable category from Woolworths AdditionalAttributes."""
    pies_json = attrs.get("piesdepartmentnamesjson")
    if pies_json:
        try:
            import json as _json
            depts = _json.loads(pies_json)
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


def _scrape_category(page, category: dict, max_pages: int) -> List[dict]:
    """Scrape all products in a single specials category using the browse API."""
    products = []
    seen_ids = set()
    cat_id = category["id"]
    cat_name = category["name"]
    cat_url = category["url"]

    for page_num in range(1, max_pages + 1):
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
                    isSpecial: true,
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
            print(f"    [woolworths] Page {page_num} evaluate error: {e}")
            break

        if result.get("status") != 200:
            print(f"    [woolworths] Page {page_num} status {result.get('status')}")
            break

        try:
            data = json.loads(result["body"])
        except json.JSONDecodeError:
            print(f"    [woolworths] Page {page_num} invalid JSON")
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

        print(f"    [woolworths] {cat_name} page {page_num}: {new_count} new (total: {len(products)}/{total})")

        if len(products) >= total or new_count == 0:
            break

        page.wait_for_timeout(800)

    return products


def scrape_woolworths(max_pages_per_category: int = 50) -> List[dict]:
    """
    Scrape Woolworths specials using stealth Playwright.
    Opens a visible Chrome, navigates to specials, then calls the browse API.
    """
    from playwright.sync_api import sync_playwright

    all_products = []
    seen_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="en-AU",
            timezone_id="Australia/Sydney",
        )
        ctx.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            delete navigator.__proto__.webdriver;
            window.chrome = {runtime: {}};
        """)

        page = ctx.new_page()

        print("  [woolworths] Establishing session ...")
        page.goto(
            f"{BASE_URL}/shop/browse/specials/half-price",
            wait_until="domcontentloaded",
            timeout=30000,
        )
        page.wait_for_timeout(6000)
        title = page.title()
        print(f"  [woolworths] Page title: {title}")

        if "unauthorised" in title.lower() or "access denied" in title.lower():
            print("  [woolworths] BLOCKED - try again in a few minutes")
            browser.close()
            return []

        for category in SPECIALS_CATEGORIES:
            print(f"  [woolworths] Scraping category: {category['name']} ...")
            cat_products = _scrape_category(page, category, max_pages_per_category)
            for cp in cat_products:
                if cp["product_id"] not in seen_ids:
                    seen_ids.add(cp["product_id"])
                    all_products.append(cp)

        browser.close()

    print(f"  [woolworths] Done: {len(all_products)} products scraped")
    return all_products


if __name__ == "__main__":
    products = scrape_woolworths(max_pages_per_category=2)
    print(f"\nGot {len(products)} products")
    for p in products[:5]:
        print(f"  {p['name']} | ${p['current_price']} (was ${p['original_price']}) {p['discount_pct']}% off")
