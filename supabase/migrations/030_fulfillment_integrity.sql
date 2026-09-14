-- Fulfillment identifiers and status changes must be unique and transactional.

DO $$
DECLARE
  v_duplicates TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM orders
    WHERE LOWER(BTRIM(COALESCE(shipment_id, ''))) IN ('undefined', 'null')
       OR LOWER(BTRIM(COALESCE(shiprocket_order_id, ''))) IN ('undefined', 'null')
       OR LOWER(BTRIM(COALESCE(awb_code, ''))) IN ('undefined', 'null')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce fulfillment integrity until sentinel identifiers are reconciled';
  END IF;

  SELECT string_agg(identifier, ', ')
  INTO v_duplicates
  FROM (
    SELECT 'shiprocket_order_id=' || shiprocket_order_id AS identifier
    FROM orders
    WHERE NULLIF(BTRIM(shiprocket_order_id), '') IS NOT NULL
    GROUP BY shiprocket_order_id
    HAVING COUNT(*) > 1
    UNION ALL
    SELECT 'shipment_id=' || shipment_id
    FROM orders
    WHERE NULLIF(BTRIM(shipment_id), '') IS NOT NULL
    GROUP BY shipment_id
    HAVING COUNT(*) > 1
    UNION ALL
    SELECT 'awb_code=' || awb_code
    FROM orders
    WHERE NULLIF(BTRIM(awb_code), '') IS NOT NULL
    GROUP BY awb_code
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot enforce fulfillment identifier uniqueness: %', v_duplicates;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_shiprocket_order_id_unique
  ON orders (shiprocket_order_id)
  WHERE NULLIF(BTRIM(shiprocket_order_id), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_shipment_id_unique
  ON orders (shipment_id)
  WHERE NULLIF(BTRIM(shipment_id), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_awb_code_unique
  ON orders (awb_code)
  WHERE NULLIF(BTRIM(awb_code), '') IS NOT NULL;

ALTER TABLE shipment_events
  ADD COLUMN IF NOT EXISTS vendor_event_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipment_events_vendor_event_id_unique'
      AND conrelid = 'shipment_events'::regclass
  ) THEN
    ALTER TABLE shipment_events
      ADD CONSTRAINT shipment_events_vendor_event_id_unique UNIQUE (vendor_event_id);
  END IF;
END;
$$;

ALTER TABLE retry_jobs DROP CONSTRAINT IF EXISTS retry_jobs_job_type_check;
ALTER TABLE retry_jobs ADD CONSTRAINT retry_jobs_job_type_check
  CHECK (
    job_type IN (
      'webhook_process',
      'tracking_sync',
      'notification',
      'label_generate',
      'invoice_generate',
      'shiprocket_persist'
    )
  );

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id UUID,
  p_expected_status TEXT,
  p_new_status TEXT,
  p_source TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF p_source NOT IN ('webhook', 'polling_sync', 'admin_manual', 'system') THEN
    RAISE EXCEPTION 'Unsupported order transition source: %', p_source;
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status <> p_expected_status THEN
    RAISE EXCEPTION 'Order status changed concurrently from % to %', p_expected_status, v_order.status;
  END IF;

  IF v_order.status = p_new_status THEN
    RETURN v_order;
  END IF;

  v_allowed := CASE v_order.status
    WHEN 'pending' THEN p_new_status IN ('confirmed', 'cancelled')
    WHEN 'confirmed' THEN p_new_status IN ('processing', 'cancelled')
    WHEN 'processing' THEN p_new_status IN ('shipped', 'cancelled')
    WHEN 'shipped' THEN p_new_status IN ('out_for_delivery', 'delivered', 'rto', 'lost', 'damaged')
    WHEN 'out_for_delivery' THEN p_new_status IN ('delivered', 'delivery_failed', 'rto')
    WHEN 'delivered' THEN p_new_status = 'returned'
    WHEN 'rto' THEN p_new_status = 'returned'
    WHEN 'returned' THEN p_new_status = 'refunded'
    WHEN 'delivery_failed' THEN p_new_status IN ('out_for_delivery', 'rto')
    ELSE FALSE
  END;

  IF NOT v_allowed AND p_source <> 'admin_manual' THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', v_order.status, p_new_status;
  END IF;

  UPDATE orders
  SET
    status = p_new_status,
    fulfillment_status = CASE
      WHEN p_new_status IN ('shipped', 'out_for_delivery', 'delivered', 'rto', 'returned')
        THEN 'fulfilled'
      WHEN p_new_status IN ('lost', 'damaged', 'delivery_failed')
        THEN 'exception'
      ELSE fulfillment_status
    END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO order_status_history (
    order_id,
    old_status,
    new_status,
    source,
    actor_id,
    metadata
  ) VALUES (
    p_order_id,
    p_expected_status,
    p_new_status,
    p_source,
    p_actor_id,
    p_metadata
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION transition_order_status(UUID, TEXT, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION transition_order_status(UUID, TEXT, TEXT, TEXT, UUID, JSONB)
  TO service_role;
