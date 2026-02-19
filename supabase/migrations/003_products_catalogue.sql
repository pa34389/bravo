-- Master product catalogue: every product we've ever seen, not just specials.
-- Used to identify items that NEVER go on sale.

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  regular_price DECIMAL(10,2),
  image_url TEXT,
  product_url TEXT,
  first_seen DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(store, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_store_product ON products(store, product_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);
