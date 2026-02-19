-- BRAVO PIVOT: Specials Tracker Schema
-- Run each block one at a time in Supabase SQL Editor

-- Block 1: Drop old tables
DROP TABLE IF EXISTS price_intelligence CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS store_products CASCADE;
DROP TABLE IF EXISTS items CASCADE;

-- Block 2: Specials (currently on sale right now)
CREATE TABLE specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  current_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_pct INT,
  image_url TEXT,
  product_url TEXT,
  special_type TEXT,
  valid_from DATE,
  valid_to DATE,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_special UNIQUE (store, product_id)
);

-- Block 3: Historical log of every special ever seen
CREATE TABLE special_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current_price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount_pct INT,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL
);

-- Block 4: Computed intelligence per product
CREATE TABLE special_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  avg_frequency_days INT,
  frequency_class TEXT,
  days_since_last_special INT,
  expected_days_until_next INT,
  is_on_special_now BOOLEAN DEFAULT false,
  last_special_date DATE,
  last_discount_pct INT,
  total_times_on_special INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_intel UNIQUE (store, product_id)
);

-- Block 5: Indexes
CREATE INDEX idx_specials_store ON specials(store);
CREATE INDEX idx_specials_discount ON specials(discount_pct DESC);
CREATE INDEX idx_specials_category ON specials(category);
CREATE INDEX idx_history_product ON special_history(store, product_id, last_seen DESC);
CREATE INDEX idx_intel_frequency ON special_intel(frequency_class, is_on_special_now);
CREATE INDEX idx_intel_store ON special_intel(store, product_id);

-- Block 6: RLS policies
ALTER TABLE specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY specials_read ON specials FOR SELECT USING (true);
CREATE POLICY special_history_read ON special_history FOR SELECT USING (true);
CREATE POLICY special_intel_read ON special_intel FOR SELECT USING (true);
