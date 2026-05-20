-- 
-- products + product_images
-- All monetary values are INTEGER PAISA. No floating-point money anywhere.
-- 

CREATE TABLE IF NOT EXISTS products (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  slug                     TEXT        NOT NULL UNIQUE,
  description              TEXT,
  short_description        TEXT,
  category_id              UUID        NOT NULL REFERENCES categories (id),
  price_paisa              INT         NOT NULL CHECK (price_paisa >= 0),
  compare_at_price_paisa   INT         CHECK (compare_at_price_paisa >= 0),
  cost_price_paisa         INT         CHECK (cost_price_paisa >= 0),
  sku                      TEXT        UNIQUE,
  stock                    INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  weight_grams             INT,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  is_featured              BOOLEAN     NOT NULL DEFAULT FALSE,
  tags                     TEXT[],
  meta_title               TEXT,
  meta_description         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug        ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured);
CREATE INDEX IF NOT EXISTS idx_products_stock       ON products (stock);
CREATE INDEX IF NOT EXISTS idx_products_price_paisa ON products (price_paisa);
CREATE INDEX IF NOT EXISTS idx_products_created_at  ON products (created_at DESC);

-- Full-text search index using pg_trgm (installed in 001)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products USING GIN (description gin_trgm_ops);

-- Row-Level Security 
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public"
  ON products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "products_select_admin"
  ON products FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "products_insert_admin"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "products_update_admin"
  ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "products_delete_admin"
  ON products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 
-- product_images
-- 

CREATE TABLE IF NOT EXISTS product_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  alt_text    TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_public"
  ON product_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active = TRUE)
  );

CREATE POLICY "product_images_select_admin"
  ON product_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "product_images_insert_admin"
  ON product_images FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "product_images_update_admin"
  ON product_images FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "product_images_delete_admin"
  ON product_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
