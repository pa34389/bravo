"""
Coles specials scraper.
Uses plain HTTP requests + __NEXT_DATA__ parsing from server-side rendered HTML.
No browser automation needed.
"""

import os
import re
import json
import time
import random
import subprocess

BASE_URL = "https://www.coles.com.au"
SPECIALS_URL = f"{BASE_URL}/on-special"
IMAGE_CDN = "https://cdn.productimages.coles.com.au/productimages"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.DOTALL
)


from typing import Optional, List, Tuple


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
        was_price = pricing.get("was")

        if now_price is None:
            continue

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


def _fetch_page(url: str, cookie_jar: str) -> Optional[str]:
    """Fetch a page using curl with persistent cookies."""
    try:
        result = subprocess.run(
            [
                "curl", "-s", "-L",
                "--cookie", cookie_jar,
                "--cookie-jar", cookie_jar,
                "-H", f"User-Agent: {USER_AGENT}",
                "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "-H", "Accept-Language: en-AU,en;q=0.9",
                "-H", "Accept-Encoding: identity",
                "-H", "Connection: keep-alive",
                "-H", f"Referer: {BASE_URL}/on-special",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            return result.stdout
        return None
    except Exception as e:
        print(f"  [coles] curl error: {e}")
        return None


def scrape_coles(max_pages: int = 200) -> List[dict]:
    """
    Scrape all Coles specials via curl + __NEXT_DATA__ parsing.
    """
    import tempfile
    cookie_jar = os.path.join(tempfile.gettempdir(), "coles_cookies.txt")

    all_products = []
    seen_ids = set()
    consecutive_failures = 0

    print(f"  [coles] Establishing session ...")
    _fetch_page(f"{BASE_URL}/on-special", cookie_jar)
    time.sleep(2)

    for page_num in range(1, max_pages + 1):
        url = SPECIALS_URL if page_num == 1 else f"{SPECIALS_URL}?page={page_num}"

        html = _fetch_page(url, cookie_jar)
        if not html:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                print(f"  [coles] 3 consecutive fetch failures, stopping")
                break
            time.sleep(5)
            continue

        nd = _parse_next_data(html)
        if not nd:
            consecutive_failures += 1
            if consecutive_failures >= 3:
                print(f"  [coles] 3 consecutive parse failures, stopping")
                break
            print(f"  [coles] Page {page_num}: no __NEXT_DATA__, backing off {5 * consecutive_failures}s ...")
            time.sleep(5 * consecutive_failures)
            continue

        consecutive_failures = 0
        products, total = _extract_products(nd)

        new_count = 0
        for p in products:
            if p["product_id"] not in seen_ids:
                seen_ids.add(p["product_id"])
                all_products.append(p)
                new_count += 1

        print(f"  [coles] Page {page_num}: {new_count} new ({len(all_products)}/{total} total)")

        if len(all_products) >= total or new_count == 0:
            break

        delay = random.uniform(2.5, 4.5)
        time.sleep(delay)

    print(f"  [coles] Done: {len(all_products)} products scraped")
    return all_products


if __name__ == "__main__":
    products = scrape_coles(max_pages=3)
    print(f"\nGot {len(products)} products")
    for p in products[:5]:
        print(f"  {p['brand'] or ''} {p['name']} | ${p['current_price']} (was ${p['original_price']}) {p['discount_pct']}% off")
