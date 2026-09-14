-- Enforce address and cart invariants behind service-role-only functions.

WITH ranked_defaults AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS default_rank
  FROM addresses
  WHERE is_default = TRUE
)
UPDATE addresses
SET is_default = FALSE
FROM ranked_defaults
WHERE addresses.id = ranked_defaults.id
  AND ranked_defaults.default_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_per_user
  ON addresses (user_id)
  WHERE is_default = TRUE;

DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
REVOKE INSERT, UPDATE, DELETE ON TABLE addresses FROM anon, authenticated;

DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;
REVOKE INSERT, UPDATE, DELETE ON TABLE cart_items FROM anon, authenticated;

CREATE OR REPLACE FUNCTION set_default_address(
  p_user_id UUID,
  p_address_id UUID
)
RETURNS addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_address addresses;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  SELECT * INTO selected_address
  FROM addresses
  WHERE id = p_address_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE addresses
  SET is_default = FALSE
  WHERE user_id = p_user_id AND is_default = TRUE AND id <> p_address_id;

  UPDATE addresses
  SET is_default = TRUE
  WHERE id = p_address_id
  RETURNING * INTO selected_address;

  RETURN selected_address;
END;
$$;

CREATE OR REPLACE FUNCTION add_cart_item_checked(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_stock INT;
  product_active BOOLEAN;
  cart_item_id UUID;
  current_quantity INT;
  next_quantity INT;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100' USING ERRCODE = '22023';
  END IF;

  SELECT stock, is_active INTO available_stock, product_active
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND OR product_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, quantity INTO cart_item_id, current_quantity
  FROM cart_items
  WHERE user_id = p_user_id AND product_id = p_product_id
  FOR UPDATE;

  next_quantity := COALESCE(current_quantity, 0) + p_quantity;

  IF next_quantity > 100 THEN
    RAISE EXCEPTION 'Maximum 100 units per item' USING ERRCODE = '22023';
  END IF;

  IF next_quantity > available_stock THEN
    RAISE EXCEPTION 'Only % units available', available_stock USING ERRCODE = 'P0001';
  END IF;

  IF cart_item_id IS NULL THEN
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (p_user_id, p_product_id, next_quantity)
    RETURNING id INTO cart_item_id;
  ELSE
    UPDATE cart_items
    SET quantity = next_quantity
    WHERE id = cart_item_id;
  END IF;

  RETURN cart_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_cart_item_quantity_checked(
  p_user_id UUID,
  p_cart_item_id UUID,
  p_quantity INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_id_value UUID;
  available_stock INT;
  product_active BOOLEAN;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100' USING ERRCODE = '22023';
  END IF;

  SELECT product_id INTO product_id_value
  FROM cart_items
  WHERE id = p_cart_item_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT stock, is_active INTO available_stock, product_active
  FROM products
  WHERE id = product_id_value
  FOR UPDATE;

  IF NOT FOUND OR product_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM cart_items
  WHERE id = p_cart_item_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_quantity > available_stock THEN
    RAISE EXCEPTION 'Only % units available', available_stock USING ERRCODE = 'P0001';
  END IF;

  UPDATE cart_items
  SET quantity = p_quantity
  WHERE id = p_cart_item_id AND user_id = p_user_id;

  RETURN p_cart_item_id;
END;
$$;

REVOKE ALL ON FUNCTION set_default_address(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION add_cart_item_checked(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION set_cart_item_quantity_checked(UUID, UUID, INT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION set_default_address(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_cart_item_checked(UUID, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION set_cart_item_quantity_checked(UUID, UUID, INT) TO service_role;

INSERT INTO site_settings (key, value)
VALUES (
  'shipping_methods',
  '{
    "standard": {
      "enabled": true,
      "label": "Standard Shipping",
      "description": "5–7 business days",
      "charge_paisa": 15000,
      "free_threshold_paisa": 100000
    },
    "express": {
      "enabled": true,
      "label": "Express Shipping",
      "description": "1–2 business days",
      "charge_paisa": 9900,
      "free_threshold_paisa": 0
    }
  }'::JSONB
)
ON CONFLICT (key) DO NOTHING;
