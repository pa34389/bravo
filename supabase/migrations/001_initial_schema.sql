-- Bravo: Australian Grocery Price Tracker
-- Run this in Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core item catalog (the 50 curated staples)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_measure TEXT,
  unit_quantity DECIMAL(10,3),
  image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Store-specific product mapping
CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  store_product_id TEXT NOT NULL,
  store_product_name TEXT NOT NULL,
  product_url TEXT,
  barcode TEXT,
  is_available BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_store_product UNIQUE (store, store_product_id)
);

-- Daily price snapshots
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,4),
  was_on_special BOOLEAN DEFAULT false,
  original_price DECIMAL(10,2),
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Precomputed intelligence (updated by scraper after each run)
CREATE TABLE IF NOT EXISTS price_intelligence (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  cheapest_store TEXT,
  cheapest_price DECIMAL(10,2),
  price_gap DECIMAL(10,2),
  woolworths_price DECIMAL(10,2),
  coles_price DECIMAL(10,2),
  woolworths_trend TEXT,
  coles_trend TEXT,
  woolworths_30d_low DECIMAL(10,2),
  woolworths_30d_high DECIMAL(10,2),
  coles_30d_low DECIMAL(10,2),
  coles_30d_high DECIMAL(10,2),
  all_time_low DECIMAL(10,2),
  all_time_low_store TEXT,
  all_time_low_date TIMESTAMPTZ,
  is_genuine_special BOOLEAN,
  special_frequency_days INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scraper run log
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  status TEXT NOT NULL,
  items_scraped INT DEFAULT 0,
  items_failed INT DEFAULT 0,
  raw_log JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history(store_product_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_products_item ON store_products(item_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_cheapest ON price_intelligence(cheapest_store, price_gap DESC);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category, sort_order);

-- Row Level Security: public read, write via service role only
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_public_read ON items FOR SELECT USING (true);
CREATE POLICY store_products_public_read ON store_products FOR SELECT USING (true);
CREATE POLICY price_history_public_read ON price_history FOR SELECT USING (true);
CREATE POLICY price_intelligence_public_read ON price_intelligence FOR SELECT USING (true);
CREATE POLICY scraper_runs_public_read ON scraper_runs FOR SELECT USING (true);
