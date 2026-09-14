BEGIN;

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_event_id UUID NOT NULL REFERENCES outbox_events (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead', 'skipped')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INT NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (outbox_event_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_deliveries_claim_idx
  ON notification_deliveries (available_at, created_at)
  WHERE status IN ('pending', 'failed', 'processing');

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE notification_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE notification_deliveries TO service_role;

DROP TRIGGER IF EXISTS notification_deliveries_set_updated_at ON notification_deliveries;
CREATE TRIGGER notification_deliveries_set_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  v_history_id UUID;
  v_event_type TEXT;
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
  ) RETURNING id INTO v_history_id;

  v_event_type := CASE p_new_status
    WHEN 'shipped' THEN 'order.shipped'
    WHEN 'out_for_delivery' THEN 'order.out_for_delivery'
    WHEN 'delivered' THEN 'order.delivered'
    WHEN 'cancelled' THEN 'order.cancelled'
    WHEN 'rto' THEN 'order.rto'
    WHEN 'returned' THEN 'order.returned'
    WHEN 'refunded' THEN 'order.refunded'
    WHEN 'delivery_failed' THEN 'order.delivery_failed'
    WHEN 'lost' THEN 'order.lost'
    WHEN 'damaged' THEN 'order.damaged'
    ELSE NULL
  END;

  IF v_event_type IS NULL THEN
    RETURN v_order;
  END IF;

  INSERT INTO outbox_events (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    deduplication_key
  ) VALUES (
    'order',
    v_order.id,
    v_event_type,
    JSONB_BUILD_OBJECT(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'user_id', v_order.user_id,
      'old_status', p_expected_status,
      'new_status', p_new_status,
      'history_id', v_history_id
    ),
    'order.status_changed:' || v_history_id::TEXT
  ) ON CONFLICT (deduplication_key) DO NOTHING;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION transition_order_status(UUID, TEXT, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION transition_order_status(UUID, TEXT, TEXT, TEXT, UUID, JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION claim_notification_outbox(p_limit INT DEFAULT 20)
RETURNS SETOF outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE outbox_events
  SET
    status = 'dead',
    claimed_at = NULL,
    last_error = COALESCE(last_error, 'Notification outbox exhausted its retry limit')
  WHERE aggregate_type = 'order'
    AND status = 'processing'
    AND claimed_at < NOW() - INTERVAL '10 minutes'
    AND attempts >= 10;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM outbox_events
    WHERE aggregate_type = 'order'
      AND event_type IN (
        'order.payment_captured',
        'order.payment_failed',
        'order.shipped',
        'order.out_for_delivery',
        'order.delivered',
        'order.cancelled',
        'order.rto',
        'order.returned',
        'order.refunded',
        'order.delivery_failed',
        'order.lost',
        'order.damaged'
      )
      AND (
        (status IN ('pending', 'failed') AND available_at <= NOW())
        OR (status = 'processing' AND claimed_at < NOW() - INTERVAL '10 minutes')
      )
      AND attempts < 10
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  )
  UPDATE outbox_events AS event
  SET
    status = 'processing',
    attempts = event.attempts + 1,
    claimed_at = NOW(),
    last_error = NULL
  FROM candidates
  WHERE event.id = candidates.id
  RETURNING event.*;
END;
$$;

CREATE OR REPLACE FUNCTION complete_notification_outbox(p_outbox_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE outbox_events
  SET status = 'completed', completed_at = NOW(), claimed_at = NULL, last_error = NULL
  WHERE id = p_outbox_event_id AND status = 'processing';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION fail_notification_outbox(
  p_outbox_event_id UUID,
  p_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE outbox_events
  SET
    status = CASE WHEN attempts >= 10 THEN 'dead' ELSE 'failed' END,
    available_at = NOW() + (LEAST(3600, 60 * POWER(2, attempts)) * INTERVAL '1 second'),
    claimed_at = NULL,
    last_error = LEFT(p_error, 2000)
  WHERE id = p_outbox_event_id AND status = 'processing';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION claim_notification_deliveries(p_limit INT DEFAULT 20)
RETURNS SETOF notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE notification_deliveries
  SET
    status = 'dead',
    claimed_at = NULL,
    last_error = COALESCE(last_error, 'Notification delivery exhausted its retry limit')
  WHERE status = 'processing'
    AND claimed_at < NOW() - INTERVAL '10 minutes'
    AND attempts >= max_attempts;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM notification_deliveries
    WHERE (
        (status IN ('pending', 'failed') AND available_at <= NOW())
        OR (status = 'processing' AND claimed_at < NOW() - INTERVAL '10 minutes')
      )
      AND attempts < max_attempts
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  )
  UPDATE notification_deliveries AS delivery
  SET
    status = 'processing',
    attempts = delivery.attempts + 1,
    claimed_at = NOW(),
    last_attempt_at = NOW(),
    last_error = NULL
  FROM candidates
  WHERE delivery.id = candidates.id
  RETURNING delivery.*;
END;
$$;

CREATE OR REPLACE FUNCTION complete_notification_delivery(
  p_delivery_id UUID,
  p_provider_message_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE notification_deliveries
  SET
    status = 'sent',
    sent_at = NOW(),
    claimed_at = NULL,
    provider_message_id = p_provider_message_id,
    last_error = NULL
  WHERE id = p_delivery_id AND status = 'processing';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION fail_notification_delivery(
  p_delivery_id UUID,
  p_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE notification_deliveries
  SET
    status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'failed' END,
    available_at = NOW() + (LEAST(3600, 60 * POWER(2, attempts)) * INTERVAL '1 second'),
    claimed_at = NULL,
    last_error = LEFT(p_error, 2000)
  WHERE id = p_delivery_id AND status = 'processing';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION skip_notification_delivery(
  p_delivery_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE notification_deliveries
  SET
    status = 'skipped',
    claimed_at = NULL,
    last_error = LEFT(p_reason, 2000)
  WHERE id = p_delivery_id AND status = 'processing';
  RETURN FOUND;
END;
$$;

UPDATE retry_jobs
SET
  status = 'dead',
  last_error = 'Retired: notification delivery moved to the durable outbox worker'
WHERE job_type = 'notification'
  AND status IN ('pending', 'processing');

ALTER TABLE retry_jobs DROP CONSTRAINT IF EXISTS retry_jobs_job_type_check;
ALTER TABLE retry_jobs ADD CONSTRAINT retry_jobs_job_type_check
  CHECK (
    job_type IN (
      'webhook_process',
      'tracking_sync',
      'label_generate',
      'invoice_generate',
      'shiprocket_persist'
    )
    OR (job_type = 'notification' AND status IN ('completed', 'dead'))
  );

REVOKE ALL ON FUNCTION claim_notification_outbox(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_notification_outbox(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_notification_outbox(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_notification_deliveries(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_notification_delivery(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_notification_delivery(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION skip_notification_delivery(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION claim_notification_outbox(INT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_notification_outbox(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fail_notification_outbox(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_notification_deliveries(INT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_notification_delivery(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION fail_notification_delivery(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION skip_notification_delivery(UUID, TEXT) TO service_role;

COMMIT;
