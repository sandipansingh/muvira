--
-- decrement_stock
-- Atomically decrements product stock by qty.
-- Race-safe: the WHERE stock >= qty prevents oversell at the DB level.
-- Returns the new stock value, or NULL if insufficient stock.
--
-- If NULL is returned, the caller (payment capture logic) should set
-- fulfillment_status = 'exception' on the order for manual admin reconciliation.
-- The payment is still considered captured - do NOT refund automatically.
--
-- DROP before CREATE OR REPLACE because Postgres does not allow changing a
-- function's return type signature in-place (SQLSTATE 42P13).
--

DROP FUNCTION IF EXISTS decrement_stock(UUID, INT);

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock INT;
BEGIN
  UPDATE products
  SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty
  RETURNING stock INTO new_stock;

  -- new_stock is NULL if no row was updated (insufficient stock)
  RETURN new_stock;
END;
$$;

--
-- increment_coupon_usage
-- Atomically increments the times_used counter on a coupon.
-- SECURITY DEFINER so it can be called safely without direct UPDATE policy.
--

DROP FUNCTION IF EXISTS increment_coupon_usage(UUID);

CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons
  SET times_used = times_used + 1
  WHERE id = p_coupon_id;
END;
$$;

--
-- check_webhook_duplicate
-- Returns TRUE if this Razorpay event has already been processed.
-- Called before processing any webhook to implement idempotency.
--

DROP FUNCTION IF EXISTS check_webhook_duplicate(TEXT);

CREATE OR REPLACE FUNCTION check_webhook_duplicate(p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_flag BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM payment_logs
    WHERE razorpay_event_id = p_event_id
      AND event_type IN ('webhook_processed', 'webhook_duplicate')
  ) INTO exists_flag;
  RETURN exists_flag;
END;
$$;

--
-- Low-stock view - used by admin inventory endpoint
--

CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock,
  c.name AS category_name
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.stock <= 10 AND p.is_active = TRUE
ORDER BY p.stock ASC;
