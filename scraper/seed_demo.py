"""
Seed realistic demo data into the pivoted specials schema.
Run:  python -m scraper.seed_demo
"""

import os
import random
from datetime import datetime, timedelta, date
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

DEMO_SPECIALS = [
    # (name, brand, category, original_price, discount_pct, special_type, store)
    ("Full Cream Milk 2L", "Devondale", "Dairy", 3.60, 50, "half-price", "woolworths"),
    ("Free Range Eggs 12pk", "Sunny Queen", "Dairy", 6.50, 30, "reduced", "coles"),
    ("Sourdough Bread 650g", "Tip Top", "Bakery", 5.50, 50, "half-price", "woolworths"),
    ("Greek Yoghurt 1kg", "Chobani", "Dairy", 8.00, 40, "reduced", "coles"),
    ("Chicken Breast 500g", "Ingham's", "Meat", 10.00, 50, "half-price", "woolworths"),
    ("Basmati Rice 1kg", "SunRice", "Pantry", 5.00, 30, "reduced", "coles"),
    ("Pasta 500g", "Barilla", "Pantry", 3.50, 50, "half-price", "woolworths"),
    ("Tin Tomatoes 400g", "Mutti", "Pantry", 3.00, 33, "reduced", "coles"),
    ("Cheddar Cheese 500g", "Bega", "Dairy", 7.50, 50, "half-price", "woolworths"),
    ("Orange Juice 2L", "Nudie", "Drinks", 6.00, 40, "reduced", "coles"),
    ("Frozen Peas 1kg", "Birds Eye", "Frozen", 4.50, 50, "half-price", "woolworths"),
    ("Butter 250g", "Western Star", "Dairy", 5.00, 30, "reduced", "coles"),
    ("Laundry Liquid 2L", "Omo", "Household", 16.00, 50, "half-price", "woolworths"),
    ("Dish Tablets 40pk", "Finish", "Household", 18.00, 40, "reduced", "coles"),
    ("Coca-Cola 10×375ml", "Coca-Cola", "Drinks", 18.50, 33, "reduced", "woolworths"),
    ("Tim Tams 200g", "Arnott's", "Snacks", 4.65, 50, "half-price", "coles"),
    ("Weet-Bix 575g", "Sanitarium", "Pantry", 4.50, 40, "reduced", "woolworths"),
    ("Bananas 1kg", None, "Fruit & Veg", 3.90, 25, "reduced", "coles"),
    ("Avocados 4pk", None, "Fruit & Veg", 7.00, 30, "reduced", "woolworths"),
    ("Salmon Fillets 200g", "Tassal", "Seafood", 9.00, 33, "reduced", "coles"),
    ("Toilet Paper 24pk", "Quilton", "Household", 15.00, 50, "half-price", "woolworths"),
    ("Olive Oil 500ml", "Cobram Estate", "Pantry", 10.00, 30, "reduced", "coles"),
    ("Instant Coffee 150g", "Nescafé", "Pantry", 12.00, 40, "reduced", "woolworths"),
    ("Peanut Butter 375g", "Kraft", "Pantry", 5.50, 30, "reduced", "coles"),
    ("Almond Milk 1L", "Vitasoy", "Dairy", 3.50, 40, "reduced", "woolworths"),
    ("Strawberries 250g", None, "Fruit & Veg", 4.50, 33, "reduced", "coles"),
    ("Mince Beef 500g", None, "Meat", 8.00, 25, "reduced", "woolworths"),
    ("Pork Sausages 500g", None, "Meat", 7.00, 30, "reduced", "coles"),
    ("Corn Chips 230g", "Doritos", "Snacks", 5.00, 50, "half-price", "woolworths"),
    ("Ice Cream 1L", "Connoisseur", "Frozen", 12.00, 50, "half-price", "coles"),
]

FREQUENCY_PROFILES = {
    "frequent": {"avg_days": 14, "times": 20, "class": "frequent"},
    "sometimes": {"avg_days": 35, "times": 8, "class": "sometimes"},
    "rare": {"avg_days": 90, "times": 3, "class": "rare"},
}


def run():
    today = date.today()

    print(f"Seeding {len(DEMO_SPECIALS)} specials …")
    specials_rows = []
    intel_rows = []
    history_rows = []

    for idx, (name, brand, category, orig, disc, stype, store) in enumerate(DEMO_SPECIALS):
        product_id = f"demo-{idx:03d}"
        sale_price = round(orig * (1 - disc / 100), 2)

        specials_rows.append(
            {
                "store": store,
                "product_id": product_id,
                "name": name,
                "brand": brand,
                "category": category,
                "current_price": sale_price,
                "original_price": orig,
                "discount_pct": disc,
                "image_url": None,
                "product_url": None,
                "special_type": stype,
                "valid_from": str(today - timedelta(days=random.randint(0, 2))),
                "valid_to": str(today + timedelta(days=random.randint(3, 6))),
            }
        )

        freq_key = random.choices(
            ["frequent", "sometimes", "rare"], weights=[5, 3, 2]
        )[0]
        profile = FREQUENCY_PROFILES[freq_key]

        jitter = random.randint(-3, 3)
        avg_freq = max(7, profile["avg_days"] + jitter)
        times = profile["times"] + random.randint(-1, 2)
        days_since = 0  # on special right now

        intel_rows.append(
            {
                "store": store,
                "product_id": product_id,
                "name": name,
                "category": category,
                "image_url": None,
                "avg_frequency_days": avg_freq,
                "frequency_class": profile["class"],
                "days_since_last_special": days_since,
                "expected_days_until_next": 0,
                "is_on_special_now": True,
                "last_special_date": str(today),
                "last_discount_pct": disc,
                "total_times_on_special": max(1, times),
            }
        )

        for h in range(min(times, 8)):
            past_date = today - timedelta(days=(h + 1) * avg_freq + random.randint(-5, 5))
            end_date = past_date + timedelta(days=random.randint(5, 8))
            past_disc = disc + random.randint(-5, 5)
            past_disc = max(10, min(60, past_disc))
            past_price = round(orig * (1 - past_disc / 100), 2)
            history_rows.append(
                {
                    "store": store,
                    "product_id": product_id,
                    "name": name,
                    "current_price": past_price,
                    "original_price": orig,
                    "discount_pct": past_disc,
                    "first_seen": str(past_date),
                    "last_seen": str(end_date),
                }
            )

    # Add some "not on special" items to special_intel only (for watchlist waiting state)
    NOT_ON_SPECIAL = [
        ("Vegemite 380g", "Kraft", "Pantry", "woolworths", "sometimes", 45, 21, 6, 30),
        ("Shapes 175g", "Arnott's", "Snacks", "coles", "frequent", 14, 5, 15, 50),
        ("Weetbix Bites", "Sanitarium", "Pantry", "woolworths", "rare", 75, 60, 3, 40),
        ("Dishwashing Liquid 1L", "Morning Fresh", "Household", "coles", "sometimes", 28, 18, 9, 30),
        ("Cat Food 12pk", "Whiskas", "Pet", "woolworths", "frequent", 10, 3, 22, 50),
        ("Frozen Pizza 400g", "Dr Oetker", "Frozen", "coles", "rare", 100, 85, 2, 40),
        ("Soy Sauce 500ml", "Kikkoman", "Pantry", "woolworths", "rare", 120, 95, 2, 30),
        ("Paper Towel 6pk", "Viva", "Household", "coles", "frequent", 12, 4, 18, 50),
    ]

    for idx2, (name, brand, category, store, freq_cls, avg_f, days_s, times_t, last_disc) in enumerate(NOT_ON_SPECIAL):
        product_id = f"demo-wait-{idx2:03d}"
        expected = max(0, avg_f - days_s)
        last_date = today - timedelta(days=days_s)
        intel_rows.append(
            {
                "store": store,
                "product_id": product_id,
                "name": name,
                "category": category,
                "image_url": None,
                "avg_frequency_days": avg_f,
                "frequency_class": freq_cls,
                "days_since_last_special": days_s,
                "expected_days_until_next": expected,
                "is_on_special_now": False,
                "last_special_date": str(last_date),
                "last_discount_pct": last_disc,
                "total_times_on_special": times_t,
            }
        )

    # Batch upserts
    print("  Writing specials …")
    db.table("specials").upsert(specials_rows, on_conflict="store,product_id").execute()

    print("  Writing special_intel …")
    db.table("special_intel").upsert(intel_rows, on_conflict="store,product_id").execute()

    print("  Writing special_history …")
    # History has no unique constraint so we delete first then insert
    db.table("special_history").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    if history_rows:
        db.table("special_history").insert(history_rows).execute()

    print(f"Done! {len(specials_rows)} specials, {len(intel_rows)} intel rows, {len(history_rows)} history rows.")


if __name__ == "__main__":
    run()
