-- 
-- Order number generation
-- Generates collision-free, human-readable order numbers e.g. MUV-000001.
-- The prefix is configurable via the DB sequence name; the env var ORDER_PREFIX
-- is applied at the application layer when constructing the final string.
-- 

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_order_number(prefix TEXT DEFAULT 'MUV')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  SELECT nextval('order_number_seq') INTO next_val;
  -- Zero-pads to 6 digits; increase width here if > 999999 orders expected
  RETURN prefix || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$;

-- 
-- orders
-- All monetary snapshot fields are immutable once set (the application layer
-- must never UPDATE them after order creation).
-- 

CREATE TABLE IF NOT EXISTS orders (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT        NOT NULL UNIQUE,
  user_id               UUID        NOT NULL REFERENCES profiles (id),
  status                TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  fulfillment_status    TEXT        NOT NULL DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled','partial','fulfilled','exception')),

  -- Shipping address snapshot — copied at order-creation time; immutable.
  -- Never reference the addresses table from here after creation.
  shipping_full_name    TEXT        NOT NULL,
  shipping_phone        TEXT        NOT NULL,
  shipping_address_line1 TEXT       NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city         TEXT        NOT NULL,
  shipping_state        TEXT        NOT NULL,
  shipping_pincode      TEXT        NOT NULL,
  shipping_country      TEXT        NOT NULL DEFAULT 'India',

  -- All amounts in INTEGER PAISA — no floating-point money
  subtotal_paisa        INT         NOT NULL CHECK (subtotal_paisa >= 0),
  discount_amount_paisa INT         NOT NULL DEFAULT 0 CHECK (discount_amount_paisa >= 0),
  shipping_amount_paisa INT         NOT NULL DEFAULT 0 CHECK (shipping_amount_paisa >= 0),
  tax_amount_paisa      INT         NOT NULL DEFAULT 0 CHECK (tax_amount_paisa >= 0),
  total_amount_paisa    INT         NOT NULL CHECK (total_amount_paisa >= 0),

  -- Coupon snapshot
  coupon_id             UUID        REFERENCES coupons (id) ON DELETE SET NULL,
  coupon_code           TEXT,
  coupon_discount_paisa INT         NOT NULL DEFAULT 0,

  -- Manual fulfillment tracking — no shipping API; free-text fields only
  carrier_name          TEXT,
  tracking_id           TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders (created_at DESC);

-- Row-Level Security 
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own orders (application layer sets user_id from JWT)
CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read and update ALL orders
CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 
-- order_items
-- Product snapshot: name, sku, image, price captured at order time.
-- These fields must NEVER be updated after insert.
-- 

CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID  NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id          UUID  NOT NULL REFERENCES products (id),
  -- Immutable snapshot columns:
  product_name        TEXT  NOT NULL,
  product_sku         TEXT,
  product_image_url   TEXT,
  quantity            INT   NOT NULL CHECK (quantity > 0),
  unit_price_paisa    INT   NOT NULL CHECK (unit_price_paisa >= 0),
  total_price_paisa   INT   NOT NULL CHECK (total_price_paisa >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- Row-Level Security 
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can see items only from their own orders
CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_own"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Admins can read all order items
CREATE POLICY "order_items_select_admin"
  ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
