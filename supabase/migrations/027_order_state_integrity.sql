-- Rebuild order constraints by exact name and repair timestamped job tables.

DO $$
DECLARE
  invalid_statuses TEXT;
BEGIN
  SELECT string_agg(DISTINCT status, ', ')
  INTO invalid_statuses
  FROM orders
  WHERE status NOT IN (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rto',
    'returned',
    'refunded',
    'lost',
    'damaged',
    'delivery_failed'
  );

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid order statuses must be reconciled before migration: %', invalid_statuses;
  END IF;

  SELECT string_agg(DISTINCT payment_status, ', ')
  INTO invalid_statuses
  FROM orders
  WHERE payment_status NOT IN ('pending', 'paid', 'failed', 'refunded');

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid payment statuses must be reconciled before migration: %', invalid_statuses;
  END IF;

  SELECT string_agg(DISTINCT fulfillment_status, ', ')
  INTO invalid_statuses
  FROM orders
  WHERE fulfillment_status NOT IN ('unfulfilled', 'partial', 'fulfilled', 'exception');

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid fulfillment statuses must be reconciled before migration: %', invalid_statuses;
  END IF;

  SELECT string_agg(DISTINCT fulfillment_step, ', ')
  INTO invalid_statuses
  FROM orders
  WHERE fulfillment_step IS NOT NULL
    AND fulfillment_step NOT IN (
      'idle',
      'order_created',
      'awb_assigned',
      'pickup_scheduled',
      'label_generated',
      'manifest_generated',
      'ready_for_pickup'
    );

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid fulfillment steps must be reconciled before migration: %', invalid_statuses;
  END IF;
END;
$$;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_allowed;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_allowed;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_allowed;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_step_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_step_allowed;

ALTER TABLE orders ADD CONSTRAINT orders_status_allowed
  CHECK (status IN (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rto',
    'returned',
    'refunded',
    'lost',
    'damaged',
    'delivery_failed'
  ));

ALTER TABLE orders ADD CONSTRAINT orders_payment_status_allowed
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_allowed
  CHECK (fulfillment_status IN ('unfulfilled', 'partial', 'fulfilled', 'exception'));

ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_step_allowed
  CHECK (
    fulfillment_step IS NULL
    OR fulfillment_step IN (
      'idle',
      'order_created',
      'awb_assigned',
      'pickup_scheduled',
      'label_generated',
      'manifest_generated',
      'ready_for_pickup'
    )
  );

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS webhook_events_set_updated_at ON webhook_events;
CREATE TRIGGER webhook_events_set_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sync_jobs_set_updated_at ON sync_jobs;
CREATE TRIGGER sync_jobs_set_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
