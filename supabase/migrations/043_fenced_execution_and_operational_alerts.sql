BEGIN;

CREATE TABLE operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (CHAR_LENGTH(alert_type) BETWEEN 1 AND 120),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  source TEXT NOT NULL CHECK (CHAR_LENGTH(source) BETWEEN 1 AND 80),
  reference_id TEXT NOT NULL CHECK (CHAR_LENGTH(reference_id) BETWEEN 1 AND 300),
  order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  webhook_event_id UUID REFERENCES webhook_events (id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (CHAR_LENGTH(message) BETWEEN 1 AND 2000),
  details JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (JSONB_TYPEOF(details) = 'object'),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences > 0),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX operational_alerts_active_reference_unique
  ON operational_alerts (alert_type, source, reference_id)
  WHERE status <> 'resolved';

CREATE INDEX operational_alerts_status_last_seen_idx
  ON operational_alerts (status, last_seen_at DESC);

ALTER TABLE operational_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE operational_alerts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE operational_alerts TO service_role;

CREATE TRIGGER operational_alerts_set_updated_at
  BEFORE UPDATE ON operational_alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE operation_leases (
  scope TEXT NOT NULL CHECK (CHAR_LENGTH(scope) BETWEEN 1 AND 80),
  resource_id TEXT NOT NULL CHECK (CHAR_LENGTH(resource_id) BETWEEN 1 AND 300),
  fencing_token BIGINT NOT NULL DEFAULT 0 CHECK (fencing_token >= 0),
  owner_token UUID,
  guard_type TEXT CHECK (guard_type IN ('retry_job', 'razorpay_webhook')),
  guard_id UUID,
  guard_token UUID,
  claimed_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, resource_id),
  CHECK (
    (owner_token IS NULL AND claimed_at IS NULL AND lease_expires_at IS NULL)
    OR (owner_token IS NOT NULL AND claimed_at IS NOT NULL AND lease_expires_at IS NOT NULL)
  ),
  CHECK (
    (guard_type IS NULL AND guard_id IS NULL AND guard_token IS NULL)
    OR (guard_type IS NOT NULL AND guard_id IS NOT NULL AND guard_token IS NOT NULL)
  )
);

CREATE INDEX operation_leases_expiry_idx
  ON operation_leases (lease_expires_at)
  WHERE owner_token IS NOT NULL;

ALTER TABLE operation_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE operation_leases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE operation_leases TO service_role;

CREATE TRIGGER operation_leases_set_updated_at
  BEFORE UPDATE ON operation_leases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION claim_operation_lease(
  p_scope TEXT,
  p_resource_id TEXT,
  p_lease_seconds INTEGER DEFAULT 120,
  p_guard_type TEXT DEFAULT NULL,
  p_guard_id UUID DEFAULT NULL,
  p_guard_token UUID DEFAULT NULL
)
RETURNS SETOF operation_leases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NULLIF(BTRIM(p_scope), '') IS NULL OR NULLIF(BTRIM(p_resource_id), '') IS NULL THEN
    RAISE EXCEPTION 'Execution scope and resource are required' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;
  IF (p_guard_type IS NULL) <> (p_guard_id IS NULL)
    OR (p_guard_type IS NULL) <> (p_guard_token IS NULL)
    OR (p_guard_type IS NOT NULL AND p_guard_type NOT IN ('retry_job', 'razorpay_webhook')) THEN
    RAISE EXCEPTION 'Execution guard identity is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_guard_type = 'retry_job' AND NOT EXISTS (
    SELECT 1
    FROM retry_jobs
    WHERE id = p_guard_id
      AND status = 'processing'
      AND lease_token = p_guard_token
      AND lease_expires_at > NOW()
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Retry job lease is no longer owned' USING ERRCODE = '55P03';
  ELSIF p_guard_type = 'razorpay_webhook' AND NOT EXISTS (
    SELECT 1
    FROM webhook_events
    WHERE id = p_guard_id
      AND source = 'razorpay'
      AND processing_status = 'processing'
      AND processing_token = p_guard_token
      AND processing_lease_expires_at > NOW()
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Webhook processing lease is no longer owned' USING ERRCODE = '55P03';
  END IF;

  INSERT INTO operation_leases (scope, resource_id)
  VALUES (LEFT(BTRIM(p_scope), 80), LEFT(BTRIM(p_resource_id), 300))
  ON CONFLICT (scope, resource_id) DO NOTHING;

  RETURN QUERY
  UPDATE operation_leases
  SET
    fencing_token = operation_leases.fencing_token + 1,
    owner_token = gen_random_uuid(),
    guard_type = p_guard_type,
    guard_id = p_guard_id,
    guard_token = p_guard_token,
    claimed_at = NOW(),
    lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds)
  WHERE operation_leases.scope = LEFT(BTRIM(p_scope), 80)
    AND operation_leases.resource_id = LEFT(BTRIM(p_resource_id), 300)
    AND (
      operation_leases.owner_token IS NULL
      OR operation_leases.lease_expires_at <= NOW()
    )
  RETURNING operation_leases.*;
END;
$$;

CREATE OR REPLACE FUNCTION renew_operation_lease(
  p_scope TEXT,
  p_resource_id TEXT,
  p_owner_token UUID,
  p_fencing_token BIGINT,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NULLIF(BTRIM(p_scope), '') IS NULL
    OR NULLIF(BTRIM(p_resource_id), '') IS NULL
    OR p_owner_token IS NULL
    OR p_fencing_token IS NULL THEN
    RAISE EXCEPTION 'Execution lease identity is required' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  UPDATE operation_leases
  SET lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds)
  WHERE scope = BTRIM(p_scope)
    AND resource_id = BTRIM(p_resource_id)
    AND owner_token = p_owner_token
    AND fencing_token = p_fencing_token
    AND lease_expires_at > NOW();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_operation_lease(
  p_scope TEXT,
  p_resource_id TEXT,
  p_owner_token UUID,
  p_fencing_token BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NULLIF(BTRIM(p_scope), '') IS NULL
    OR NULLIF(BTRIM(p_resource_id), '') IS NULL
    OR p_owner_token IS NULL
    OR p_fencing_token IS NULL THEN
    RAISE EXCEPTION 'Execution lease identity is required' USING ERRCODE = '22023';
  END IF;

  UPDATE operation_leases
  SET owner_token = NULL, guard_type = NULL, guard_id = NULL, guard_token = NULL,
      claimed_at = NULL, lease_expires_at = NULL
  WHERE scope = BTRIM(p_scope)
    AND resource_id = BTRIM(p_resource_id)
    AND owner_token = p_owner_token
    AND fencing_token = p_fencing_token
    AND lease_expires_at > NOW();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION assert_execution_lease(
  p_scope TEXT,
  p_resource_id TEXT,
  p_owner_token UUID,
  p_fencing_token BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lease operation_leases%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_scope), '') IS NULL
    OR NULLIF(BTRIM(p_resource_id), '') IS NULL
    OR p_owner_token IS NULL
    OR p_fencing_token IS NULL THEN
    RAISE EXCEPTION 'Execution lease identity is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_lease
  FROM operation_leases
  WHERE scope = BTRIM(p_scope)
    AND resource_id = BTRIM(p_resource_id)
    AND owner_token = p_owner_token
    AND fencing_token = p_fencing_token
    AND lease_expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution lease is no longer owned' USING ERRCODE = '55P03';
  END IF;

  IF v_lease.guard_type = 'retry_job' AND NOT EXISTS (
    SELECT 1
    FROM retry_jobs
    WHERE id = v_lease.guard_id
      AND status = 'processing'
      AND lease_token = v_lease.guard_token
      AND lease_expires_at > NOW()
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Retry job lease is no longer owned' USING ERRCODE = '55P03';
  ELSIF v_lease.guard_type = 'razorpay_webhook' AND NOT EXISTS (
    SELECT 1
    FROM webhook_events
    WHERE id = v_lease.guard_id
      AND source = 'razorpay'
      AND processing_status = 'processing'
      AND processing_token = v_lease.guard_token
      AND processing_lease_expires_at > NOW()
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Webhook processing lease is no longer owned' USING ERRCODE = '55P03';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION persist_operational_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_source TEXT,
  p_reference_id TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_order_id UUID DEFAULT NULL,
  p_webhook_event_id UUID DEFAULT NULL
)
RETURNS operational_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alert operational_alerts%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_alert_type), '') IS NULL
    OR p_severity NOT IN ('warning', 'critical')
    OR NULLIF(BTRIM(p_source), '') IS NULL
    OR NULLIF(BTRIM(p_reference_id), '') IS NULL
    OR NULLIF(BTRIM(p_message), '') IS NULL
    OR p_details IS NULL
    OR JSONB_TYPEOF(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Invalid operational alert' USING ERRCODE = '22023';
  END IF;

  INSERT INTO operational_alerts (
    alert_type, severity, source, reference_id, order_id, webhook_event_id, message, details
  ) VALUES (
    LEFT(BTRIM(p_alert_type), 120),
    p_severity,
    LEFT(BTRIM(p_source), 80),
    LEFT(BTRIM(p_reference_id), 300),
    p_order_id,
    p_webhook_event_id,
    LEFT(BTRIM(p_message), 2000),
    p_details
  )
  ON CONFLICT (alert_type, source, reference_id)
    WHERE status <> 'resolved'
  DO UPDATE SET
    severity = EXCLUDED.severity,
    order_id = COALESCE(EXCLUDED.order_id, operational_alerts.order_id),
    webhook_event_id = COALESCE(
      EXCLUDED.webhook_event_id,
      operational_alerts.webhook_event_id
    ),
    message = EXCLUDED.message,
    details = operational_alerts.details || EXCLUDED.details,
    occurrences = operational_alerts.occurrences + 1,
    last_seen_at = NOW()
  RETURNING * INTO v_alert;

  RETURN v_alert;
END;
$$;

CREATE OR REPLACE FUNCTION persist_operational_alert_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_alert_type TEXT,
  p_severity TEXT,
  p_source TEXT,
  p_reference_id TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_order_id UUID DEFAULT NULL,
  p_webhook_event_id UUID DEFAULT NULL
)
RETURNS operational_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  RETURN persist_operational_alert(
    p_alert_type,
    p_severity,
    p_source,
    p_reference_id,
    p_message,
    p_details,
    p_order_id,
    p_webhook_event_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION finalize_captured_payment_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT,
  p_amount_paisa INT,
  p_currency TEXT,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  RETURN finalize_captured_payment(
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_razorpay_signature,
    p_amount_paisa,
    p_currency,
    p_payment_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION fail_checkout_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  RETURN fail_checkout(p_order_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION transition_order_status_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
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
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  RETURN transition_order_status(
    p_order_id,
    p_expected_status,
    p_new_status,
    p_source,
    p_actor_id,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION set_order_label_generated_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  UPDATE orders SET label_generated = TRUE WHERE id = p_order_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION apply_shiprocket_persistence_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_persistence JSONB DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF p_persistence IS NOT NULL AND JSONB_TYPEOF(p_persistence) <> 'object' THEN
    RAISE EXCEPTION 'Shiprocket persistence must be an object' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );

  UPDATE orders SET
    shiprocket_order_id = CASE WHEN p_persistence ? 'shiprocket_order_id'
      THEN p_persistence->>'shiprocket_order_id' ELSE shiprocket_order_id END,
    shipment_id = CASE WHEN p_persistence ? 'shipment_id'
      THEN p_persistence->>'shipment_id' ELSE shipment_id END,
    shiprocket_status = CASE WHEN p_persistence ? 'shiprocket_status'
      THEN p_persistence->>'shiprocket_status' ELSE shiprocket_status END,
    shiprocket_error = CASE WHEN p_persistence ? 'shiprocket_error'
      THEN p_persistence->>'shiprocket_error' ELSE shiprocket_error END,
    pickup_location = CASE WHEN p_persistence ? 'pickup_location'
      THEN p_persistence->>'pickup_location' ELSE pickup_location END,
    package_weight_grams = CASE WHEN p_persistence ? 'package_weight_grams'
      THEN (p_persistence->>'package_weight_grams')::INT ELSE package_weight_grams END,
    package_length_cm = CASE WHEN p_persistence ? 'package_length_cm'
      THEN (p_persistence->>'package_length_cm')::INT ELSE package_length_cm END,
    package_breadth_cm = CASE WHEN p_persistence ? 'package_breadth_cm'
      THEN (p_persistence->>'package_breadth_cm')::INT ELSE package_breadth_cm END,
    package_height_cm = CASE WHEN p_persistence ? 'package_height_cm'
      THEN (p_persistence->>'package_height_cm')::INT ELSE package_height_cm END,
    fulfillment_status = CASE WHEN p_persistence ? 'fulfillment_status'
      THEN p_persistence->>'fulfillment_status' ELSE fulfillment_status END,
    fulfillment_step = CASE WHEN p_persistence ? 'fulfillment_step'
      THEN p_persistence->>'fulfillment_step' ELSE fulfillment_step END,
    awb_code = CASE WHEN p_persistence ? 'awb_code'
      THEN p_persistence->>'awb_code' ELSE awb_code END,
    courier_name = CASE WHEN p_persistence ? 'courier_name'
      THEN p_persistence->>'courier_name' ELSE courier_name END,
    tracking_url = CASE WHEN p_persistence ? 'tracking_url'
      THEN p_persistence->>'tracking_url' ELSE tracking_url END,
    pickup_scheduled_date = CASE WHEN p_persistence ? 'pickup_scheduled_date'
      THEN (p_persistence->>'pickup_scheduled_date')::TIMESTAMPTZ ELSE pickup_scheduled_date END,
    pickup_token_number = CASE WHEN p_persistence ? 'pickup_token_number'
      THEN p_persistence->>'pickup_token_number' ELSE pickup_token_number END,
    label_generated = CASE WHEN p_persistence ? 'label_generated'
      THEN (p_persistence->>'label_generated')::BOOLEAN ELSE label_generated END,
    manifest_generated = CASE WHEN p_persistence ? 'manifest_generated'
      THEN (p_persistence->>'manifest_generated')::BOOLEAN ELSE manifest_generated END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION persist_shipment_event_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_shipment_id TEXT,
  p_status TEXT,
  p_location TEXT,
  p_remarks TEXT,
  p_event_time TIMESTAMPTZ,
  p_raw_payload JSONB,
  p_payload_hash TEXT,
  p_vendor_event_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  INSERT INTO shipment_events (
    order_id, shipment_id, status, location, remarks, event_time,
    raw_payload, payload_hash, vendor_event_id
  ) VALUES (
    p_order_id, p_shipment_id, p_status, p_location, p_remarks, p_event_time,
    p_raw_payload, p_payload_hash, p_vendor_event_id
  ) ON CONFLICT (vendor_event_id) DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION write_tracking_snapshot_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_awb_code TEXT,
  p_shipment_id TEXT,
  p_courier_name TEXT,
  p_current_status TEXT,
  p_origin TEXT,
  p_destination TEXT,
  p_estimated_delivery_date DATE,
  p_pickup_date TIMESTAMPTZ,
  p_delivered_date TIMESTAMPTZ,
  p_tracking_raw JSONB,
  p_sync_source TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  INSERT INTO tracking_snapshots (
    order_id, awb_code, shipment_id, courier_name, current_status, origin,
    destination, estimated_delivery_date, pickup_date, delivered_date,
    tracking_raw, sync_source
  ) VALUES (
    p_order_id, p_awb_code, p_shipment_id, p_courier_name, p_current_status, p_origin,
    p_destination, p_estimated_delivery_date, p_pickup_date, p_delivered_date,
    p_tracking_raw, p_sync_source
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION begin_invoice_generation_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_provider_reference TEXT
)
RETURNS invoice_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  RETURN begin_invoice_generation(p_order_id, p_provider_reference);
END;
$$;

CREATE OR REPLACE FUNCTION finish_invoice_generation_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_status TEXT,
  p_object_path TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('ready', 'failed') THEN
    RAISE EXCEPTION 'Invoice completion status is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'ready' AND NULLIF(BTRIM(p_object_path), '') IS NULL THEN
    RAISE EXCEPTION 'Ready invoice requires an object path' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'failed' AND NULLIF(BTRIM(p_error), '') IS NULL THEN
    RAISE EXCEPTION 'Failed invoice requires an error' USING ERRCODE = '22023';
  END IF;

  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  UPDATE invoice_records
  SET status = p_status,
      object_path = CASE WHEN p_status = 'ready' THEN p_object_path ELSE object_path END,
      generated_at = CASE WHEN p_status = 'ready' THEN NOW() ELSE generated_at END,
      last_error = CASE WHEN p_status = 'failed' THEN LEFT(p_error, 2000) ELSE NULL END
  WHERE order_id = p_order_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION retain_payable_checkout_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_provider_status TEXT,
  p_provider_amount_paid INTEGER,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_order_id TEXT;
BEGIN
  IF NULLIF(BTRIM(p_provider_status), '') IS NULL
    OR p_provider_amount_paid < 0
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Provider status, amount, and reason are required' USING ERRCODE = '22023';
  END IF;

  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );

  SELECT razorpay_order_id INTO v_provider_order_id
  FROM payments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE orders
  SET checkout_expires_at = GREATEST(checkout_expires_at, NOW() + INTERVAL '15 minutes')
  WHERE id = p_order_id
    AND status = 'pending'
    AND payment_status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM persist_operational_alert(
    'payable_checkout_retained',
    'warning',
    'checkout',
    p_order_id::TEXT,
    LEFT(p_reason, 2000),
    JSONB_BUILD_OBJECT(
      'razorpay_order_id', v_provider_order_id,
      'provider_status', BTRIM(p_provider_status),
      'provider_amount_paid', p_provider_amount_paid
    ),
    p_order_id,
    NULL
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION expire_abandoned_checkouts(p_limit INT DEFAULT 100)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expired_order RECORD;
  expired_count INT := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'Expiry limit must be between 1 and 1000' USING ERRCODE = '22023';
  END IF;

  FOR expired_order IN
    SELECT orders.id
    FROM orders
    WHERE orders.status = 'pending'
      AND orders.payment_status = 'pending'
      AND orders.checkout_expires_at < NOW()
      AND NOT EXISTS (
        SELECT 1
        FROM payments
        WHERE payments.order_id = orders.id
          AND NULLIF(BTRIM(payments.razorpay_order_id), '') IS NOT NULL
      )
    ORDER BY orders.checkout_expires_at
    LIMIT p_limit
    FOR UPDATE OF orders SKIP LOCKED
  LOOP
    IF fail_checkout(expired_order.id, 'Checkout expired before provider order creation') THEN
      expired_count := expired_count + 1;
    END IF;
  END LOOP;
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION complete_razorpay_webhook(
  p_webhook_id UUID,
  p_processing_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_webhook_id IS NULL OR p_processing_token IS NULL THEN
    RAISE EXCEPTION 'Webhook event and processing token are required' USING ERRCODE = '22023';
  END IF;

  UPDATE webhook_events
  SET processing_status = 'processed', processed_at = NOW(), error_message = NULL,
      processing_token = NULL, processing_started_at = NULL,
      processing_lease_expires_at = NULL
  WHERE id = p_webhook_id
    AND source = 'razorpay'
    AND processing_status = 'processing'
    AND processing_token = p_processing_token
    AND processing_lease_expires_at > NOW();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION fail_razorpay_webhook(
  p_webhook_id UUID,
  p_processing_token UUID,
  p_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_webhook_id IS NULL OR p_processing_token IS NULL
    OR NULLIF(BTRIM(p_error), '') IS NULL THEN
    RAISE EXCEPTION 'Webhook event, processing token, and error are required' USING ERRCODE = '22023';
  END IF;

  UPDATE webhook_events
  SET processing_status = 'failed', retry_count = retry_count + 1, processed_at = NOW(),
      error_message = LEFT(p_error, 2000), processing_token = NULL,
      processing_started_at = NULL, processing_lease_expires_at = NULL
  WHERE id = p_webhook_id
    AND source = 'razorpay'
    AND processing_status = 'processing'
    AND processing_token = p_processing_token
    AND processing_lease_expires_at > NOW();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION complete_retry_job(p_job_id UUID, p_lease_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Job and lease token are required' USING ERRCODE = '22023';
  END IF;

  UPDATE retry_jobs
  SET status = 'completed', lease_token = NULL, claimed_at = NULL,
      lease_expires_at = NULL, last_error = NULL
  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
    AND lease_expires_at > NOW();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION fail_retry_job(
  p_job_id UUID,
  p_lease_token UUID,
  p_error TEXT
)
RETURNS retry_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job retry_jobs%ROWTYPE;
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL OR NULLIF(BTRIM(p_error), '') IS NULL THEN
    RAISE EXCEPTION 'Job, lease token, and error are required' USING ERRCODE = '22023';
  END IF;

  UPDATE retry_jobs
  SET retry_count = retry_count + 1,
      status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead' ELSE 'pending' END,
      next_retry_at = CASE
        WHEN retry_count + 1 >= max_retries THEN next_retry_at
        ELSE NOW() + MAKE_INTERVAL(
          secs => LEAST(3600, (60 * POWER(2, retry_count + 1))::INTEGER)
        )
      END,
      last_error = LEFT(p_error, 2000), lease_token = NULL, claimed_at = NULL,
      lease_expires_at = NULL
  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
    AND lease_expires_at > NOW()
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retry job lease is no longer owned' USING ERRCODE = '55P03';
  END IF;
  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION claim_operation_lease(TEXT, TEXT, INTEGER, TEXT, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION renew_operation_lease(TEXT, TEXT, UUID, BIGINT, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_operation_lease(TEXT, TEXT, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION assert_execution_lease(TEXT, TEXT, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION persist_operational_alert(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION persist_operational_alert_fenced(
  TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finalize_captured_payment_fenced(
  TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT, INT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_checkout_fenced(TEXT, TEXT, UUID, BIGINT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION transition_order_status_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, UUID, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION set_order_label_generated_fenced(TEXT, TEXT, UUID, BIGINT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION apply_shiprocket_persistence_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION persist_shipment_event_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION write_tracking_snapshot_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE,
  TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION begin_invoice_generation_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finish_invoice_generation_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION retain_payable_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION claim_operation_lease(TEXT, TEXT, INTEGER, TEXT, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION renew_operation_lease(TEXT, TEXT, UUID, BIGINT, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION release_operation_lease(TEXT, TEXT, UUID, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION assert_execution_lease(TEXT, TEXT, UUID, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION persist_operational_alert(
  TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION persist_operational_alert_fenced(
  TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION finalize_captured_payment_fenced(
  TEXT, TEXT, UUID, BIGINT, TEXT, TEXT, TEXT, INT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION fail_checkout_fenced(TEXT, TEXT, UUID, BIGINT, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION transition_order_status_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, UUID, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION set_order_label_generated_fenced(TEXT, TEXT, UUID, BIGINT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION apply_shiprocket_persistence_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION persist_shipment_event_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION write_tracking_snapshot_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE,
  TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION begin_invoice_generation_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION finish_invoice_generation_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION retain_payable_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT
) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v42;

CREATE OR REPLACE FUNCTION public.get_runtime_schema_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contract JSONB;
  v_missing_relations JSONB;
  v_missing_columns JSONB;
  v_missing_functions JSONB;
  v_missing_indexes JSONB;
  v_missing_constraints JSONB := '[]'::JSONB;
  v_invalid_relation_grants JSONB := '[]'::JSONB;
  v_invalid_rls_relations JSONB := '[]'::JSONB;
  v_latest_migration TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v42();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_relations
  FROM (VALUES ('operation_leases'), ('operational_alerts')) AS expected(name)
  WHERE TO_REGCLASS('public.' || expected.name) IS NULL;

  SELECT COALESCE(
    JSONB_AGG(expected.relation || '.' || expected.column_name ORDER BY expected.relation, expected.column_name),
    '[]'::JSONB
  )
  INTO v_missing_columns
  FROM (VALUES
    ('operation_leases', 'scope'),
    ('operation_leases', 'resource_id'),
    ('operation_leases', 'fencing_token'),
    ('operation_leases', 'owner_token'),
    ('operation_leases', 'guard_type'),
    ('operation_leases', 'guard_id'),
    ('operation_leases', 'guard_token'),
    ('operation_leases', 'lease_expires_at'),
    ('operational_alerts', 'alert_type'),
    ('operational_alerts', 'reference_id'),
    ('operational_alerts', 'status'),
    ('operational_alerts', 'last_seen_at')
  ) AS expected(relation, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = expected.relation
      AND columns.column_name = expected.column_name
  );

  SELECT COALESCE(JSONB_AGG(expected.signature ORDER BY expected.signature), '[]'::JSONB)
  INTO v_missing_functions
  FROM (VALUES
    ('public.claim_operation_lease(text,text,integer,text,uuid,uuid)'),
    ('public.renew_operation_lease(text,text,uuid,bigint,integer)'),
    ('public.release_operation_lease(text,text,uuid,bigint)'),
    ('public.assert_execution_lease(text,text,uuid,bigint)'),
    ('public.persist_operational_alert(text,text,text,text,text,jsonb,uuid,uuid)'),
    ('public.persist_operational_alert_fenced(text,text,uuid,bigint,text,text,text,text,text,jsonb,uuid,uuid)'),
    ('public.finalize_captured_payment_fenced(text,text,uuid,bigint,text,text,text,integer,text,text)'),
    ('public.fail_checkout_fenced(text,text,uuid,bigint,uuid,text)'),
    ('public.transition_order_status_fenced(text,text,uuid,bigint,uuid,text,text,text,uuid,jsonb)'),
    ('public.set_order_label_generated_fenced(text,text,uuid,bigint,uuid)'),
    ('public.apply_shiprocket_persistence_fenced(text,text,uuid,bigint,uuid,jsonb)'),
    ('public.persist_shipment_event_fenced(text,text,uuid,bigint,uuid,text,text,text,text,timestamp with time zone,jsonb,text,text)'),
    ('public.write_tracking_snapshot_fenced(text,text,uuid,bigint,uuid,text,text,text,text,text,text,date,timestamp with time zone,timestamp with time zone,jsonb,text)'),
    ('public.begin_invoice_generation_fenced(text,text,uuid,bigint,uuid,text)'),
    ('public.finish_invoice_generation_fenced(text,text,uuid,bigint,uuid,text,text,text)'),
    ('public.retain_payable_checkout_fenced(text,text,uuid,bigint,uuid,text,integer,text)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(expected.signature) IS NULL;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_indexes
  FROM (VALUES
    ('operation_leases_expiry_idx'),
    ('operational_alerts_active_reference_unique'),
    ('operational_alerts_status_last_seen_idx')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || expected.name) IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.webhook_events'::REGCLASS
      AND conname = 'webhook_events_processing_status_check'
      AND POSITION('''processing''' IN PG_GET_CONSTRAINTDEF(oid)) > 0
  ) THEN
    v_missing_constraints := '["webhook_events.webhook_events_processing_status_check"]'::JSONB;
  END IF;

  IF TO_REGCLASS('public.operation_leases') IS NOT NULL AND (
    has_table_privilege('anon', 'public.operation_leases', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated', 'public.operation_leases', 'SELECT,INSERT,UPDATE,DELETE')
  ) THEN
    v_invalid_relation_grants := v_invalid_relation_grants || '["operation_leases"]'::JSONB;
  END IF;
  IF TO_REGCLASS('public.operational_alerts') IS NOT NULL AND (
    has_table_privilege('anon', 'public.operational_alerts', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated', 'public.operational_alerts', 'SELECT,INSERT,UPDATE,DELETE')
  ) THEN
    v_invalid_relation_grants := v_invalid_relation_grants || '["operational_alerts"]'::JSONB;
  END IF;

  IF TO_REGCLASS('public.operation_leases') IS NOT NULL
    AND NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.operation_leases'::REGCLASS) THEN
    v_invalid_rls_relations := v_invalid_rls_relations || '["operation_leases"]'::JSONB;
  END IF;
  IF TO_REGCLASS('public.operational_alerts') IS NOT NULL
    AND NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.operational_alerts'::REGCLASS) THEN
    v_invalid_rls_relations := v_invalid_rls_relations || '["operational_alerts"]'::JSONB;
  END IF;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 43,
      'migration_version', v_latest_migration,
      'missing_relations', (v_contract->'missing_relations') || v_missing_relations,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'missing_constraints', (v_contract->'missing_constraints') || v_missing_constraints,
      'invalid_relation_grants',
        (v_contract->'invalid_relation_grants') || v_invalid_relation_grants,
      'invalid_rls_relations',
        (v_contract->'invalid_rls_relations') || v_invalid_rls_relations,
      'ready',
        v_latest_migration = '043'
        AND v_contract->'missing_relations' = '[]'::JSONB
        AND v_contract->'missing_columns' = '[]'::JSONB
        AND v_contract->'missing_functions' = '[]'::JSONB
        AND v_contract->'invalid_relation_grants' = '[]'::JSONB
        AND v_contract->'invalid_function_grants' = '[]'::JSONB
        AND v_contract->'missing_constraints' = '[]'::JSONB
        AND v_contract->'invalid_rls_relations' = '[]'::JSONB
        AND v_contract->'missing_indexes' = '[]'::JSONB
        AND v_contract->'invalid_storage_capabilities' = '[]'::JSONB
        AND v_missing_relations = '[]'::JSONB
        AND v_missing_columns = '[]'::JSONB
        AND v_missing_functions = '[]'::JSONB
        AND v_missing_indexes = '[]'::JSONB
        AND v_missing_constraints = '[]'::JSONB
        AND v_invalid_relation_grants = '[]'::JSONB
        AND v_invalid_rls_relations = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v42()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v42() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
