-- Lock browser-accessible roles out of privileged commerce mutations.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
REVOKE UPDATE ON TABLE profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
REVOKE INSERT ON TABLE orders FROM anon, authenticated;
REVOKE INSERT ON TABLE order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "reviews_insert_own" ON product_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON product_reviews;
REVOKE INSERT, UPDATE ON TABLE product_reviews FROM anon, authenticated;

DROP POLICY IF EXISTS "webhook_events_insert_service_role" ON webhook_events;
DROP POLICY IF EXISTS "sync_jobs_insert_service_role" ON sync_jobs;
DROP POLICY IF EXISTS "retry_jobs_insert_service_role" ON retry_jobs;
DROP POLICY IF EXISTS "order_status_history_insert_service_role" ON order_status_history;
DROP POLICY IF EXISTS "notification_logs_insert_service_role" ON notification_logs;
DROP POLICY IF EXISTS "tracking_snapshots_insert_service_role" ON tracking_snapshots;

REVOKE INSERT ON TABLE webhook_events FROM anon, authenticated;
REVOKE INSERT ON TABLE sync_jobs FROM anon, authenticated;
REVOKE INSERT ON TABLE retry_jobs FROM anon, authenticated;
REVOKE INSERT ON TABLE order_status_history FROM anon, authenticated;
REVOKE INSERT ON TABLE notification_logs FROM anon, authenticated;
REVOKE INSERT ON TABLE tracking_snapshots FROM anon, authenticated;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stock INT;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive' USING ERRCODE = '22023';
  END IF;

  UPDATE products
  SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;

REVOKE ALL ON FUNCTION decrement_stock(UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_coupon_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION check_webhook_duplicate(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION enqueue_retry_job(TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION generate_order_number(TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION decrement_stock(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_coupon_usage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_webhook_duplicate(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_retry_job(TEXT, TEXT, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION generate_order_number(TEXT) TO service_role;
