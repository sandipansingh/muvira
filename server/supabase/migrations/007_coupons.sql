-- 
-- coupons
-- discount_value is in paisa for 'fixed' type, or an integer 0-100 for 'percentage'.
-- 

CREATE TABLE IF NOT EXISTS coupons (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    TEXT        NOT NULL UNIQUE,
  description             TEXT,
  discount_type           TEXT        NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value          INT         NOT NULL CHECK (discount_value > 0),
  min_order_amount_paisa  INT         NOT NULL DEFAULT 0 CHECK (min_order_amount_paisa >= 0),
  max_discount_paisa      INT         CHECK (max_discount_paisa > 0),  -- cap for percentage discounts
  max_uses                INT         CHECK (max_uses > 0),
  times_used              INT         NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons (is_active);

-- Row-Level Security 
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Authenticated users can look up a coupon by code (for checkout validation)
-- but cannot see cost_price or internal fields (they see what's in SELECT)
CREATE POLICY "coupons_select_authenticated"
  ON coupons FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Admins can read all coupons (including inactive)
CREATE POLICY "coupons_select_admin"
  ON coupons FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "coupons_insert_admin"
  ON coupons FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "coupons_update_admin"
  ON coupons FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "coupons_delete_admin"
  ON coupons FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
