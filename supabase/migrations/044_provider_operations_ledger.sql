BEGIN;

ALTER TABLE payments
  ADD COLUMN refunded_amount_paisa INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payments
  ADD CONSTRAINT payments_refunded_amount_bounds
  CHECK (refunded_amount_paisa >= 0 AND refunded_amount_paisa <= amount_paisa);

CREATE TABLE provider_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'shiprocket')),
  operation_type TEXT NOT NULL CHECK (
    operation_type IN ('full_refund', 'partial_refund', 'cancel_order', 'cancel_shipment')
  ),
  business_key TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(business_key)) BETWEEN 1 AND 300),
  order_id UUID NOT NULL REFERENCES orders (id),
  payment_id UUID REFERENCES payments (id),
  provider_target_type TEXT NOT NULL CHECK (
    provider_target_type IN ('payment', 'order', 'awb')
  ),
  provider_target_id TEXT NOT NULL CHECK (
    CHAR_LENGTH(BTRIM(provider_target_id)) BETWEEN 1 AND 300
  ),
  provider_generation TEXT,
  amount_paisa INTEGER CHECK (amount_paisa IS NULL OR amount_paisa > 0),
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key TEXT NOT NULL CHECK (
    CHAR_LENGTH(BTRIM(idempotency_key)) BETWEEN 1 AND 100
  ),
  cause TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(cause)) BETWEEN 1 AND 1000),
  preserve_order_state BOOLEAN NOT NULL DEFAULT FALSE,
  state TEXT NOT NULL DEFAULT 'prepared' CHECK (
    state IN (
      'prepared',
      'dispatching',
      'outcome_unknown',
      'provider_pending',
      'provider_succeeded',
      'provider_failed',
      'manual_review'
    )
  ),
  provider_operation_id TEXT,
  provider_status TEXT,
  response_metadata JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (JSONB_TYPEOF(response_metadata) = 'object'),
  error_classification TEXT,
  manual_review_reason TEXT,
  dispatch_attempts INTEGER NOT NULL DEFAULT 0 CHECK (dispatch_attempts >= 0),
  reconciliation_attempts INTEGER NOT NULL DEFAULT 0 CHECK (reconciliation_attempts >= 0),
  dispatch_started_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  provider_completed_at TIMESTAMPTZ,
  local_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_operations_business_key_unique
    UNIQUE (provider, operation_type, business_key),
  CONSTRAINT provider_operations_idempotency_key_unique
    UNIQUE (provider, idempotency_key),
  CONSTRAINT provider_operations_request_shape CHECK (
    (
      provider = 'razorpay'
      AND operation_type IN ('full_refund', 'partial_refund')
      AND payment_id IS NOT NULL
      AND provider_target_type = 'payment'
      AND amount_paisa IS NOT NULL
      AND currency IS NOT NULL
    )
    OR (
      provider = 'shiprocket'
      AND operation_type IN ('cancel_order', 'cancel_shipment')
      AND payment_id IS NULL
      AND amount_paisa IS NULL
      AND currency IS NULL
      AND (
        (operation_type = 'cancel_order' AND provider_target_type = 'order')
        OR (operation_type = 'cancel_shipment' AND provider_target_type = 'awb')
      )
    )
  )
);

CREATE INDEX provider_operations_actionable_idx
  ON provider_operations (state, updated_at)
  WHERE local_applied_at IS NULL;
CREATE INDEX provider_operations_order_idx
  ON provider_operations (order_id, created_at DESC);
CREATE INDEX provider_operations_payment_idx
  ON provider_operations (payment_id, created_at)
  WHERE payment_id IS NOT NULL;

ALTER TABLE provider_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE provider_operations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE provider_operations TO service_role;

CREATE TRIGGER provider_operations_set_updated_at
  BEFORE UPDATE ON provider_operations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION enforce_provider_operation_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF ROW(
    NEW.provider,
    NEW.operation_type,
    NEW.business_key,
    NEW.order_id,
    NEW.payment_id,
    NEW.provider_target_type,
    NEW.provider_target_id,
    NEW.provider_generation,
    NEW.amount_paisa,
    NEW.currency,
    NEW.request_hash,
    NEW.idempotency_key,
    NEW.cause,
    NEW.preserve_order_state
  ) IS DISTINCT FROM ROW(
    OLD.provider,
    OLD.operation_type,
    OLD.business_key,
    OLD.order_id,
    OLD.payment_id,
    OLD.provider_target_type,
    OLD.provider_target_id,
    OLD.provider_generation,
    OLD.amount_paisa,
    OLD.currency,
    OLD.request_hash,
    OLD.idempotency_key,
    OLD.cause,
    OLD.preserve_order_state
  ) THEN
    RAISE EXCEPTION 'Provider operation request is immutable' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provider_operations_immutable_request
  BEFORE UPDATE ON provider_operations
  FOR EACH ROW EXECUTE FUNCTION enforce_provider_operation_immutability();

CREATE OR REPLACE FUNCTION prepare_provider_operation(
  p_provider TEXT,
  p_operation_type TEXT,
  p_business_key TEXT,
  p_order_id UUID,
  p_payment_id UUID,
  p_provider_target_type TEXT,
  p_provider_target_id TEXT,
  p_amount_paisa INTEGER,
  p_currency TEXT,
  p_request_hash TEXT,
  p_cause TEXT
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operation provider_operations%ROWTYPE;
  v_operation_id UUID := gen_random_uuid();
  v_payment payments%ROWTYPE;
  v_reserved_refunds BIGINT;
  v_currency TEXT := CASE WHEN p_currency IS NULL THEN NULL ELSE UPPER(BTRIM(p_currency)) END;
BEGIN
  IF p_provider NOT IN ('razorpay', 'shiprocket')
    OR p_operation_type NOT IN ('full_refund', 'partial_refund', 'cancel_order', 'cancel_shipment')
    OR NULLIF(BTRIM(p_business_key), '') IS NULL
    OR p_order_id IS NULL
    OR p_provider_target_type NOT IN ('payment', 'order', 'awb')
    OR NULLIF(BTRIM(p_provider_target_id), '') IS NULL
    OR p_request_hash !~ '^[0-9a-f]{64}$'
    OR NULLIF(BTRIM(p_cause), '') IS NULL THEN
    RAISE EXCEPTION 'Provider operation request is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_provider = 'razorpay' THEN
    IF p_operation_type NOT IN ('full_refund', 'partial_refund')
      OR p_provider_target_type <> 'payment'
      OR p_payment_id IS NULL
      OR p_amount_paisa IS NULL
      OR p_amount_paisa <= 0
      OR COALESCE(v_currency, '') !~ '^[A-Z]{3}$' THEN
      RAISE EXCEPTION 'Refund amount, currency, payment, and target are required'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND
      OR v_payment.order_id <> p_order_id
      OR v_payment.razorpay_payment_id IS DISTINCT FROM BTRIM(p_provider_target_id)
      OR v_payment.currency <> v_currency
      OR v_payment.status NOT IN ('captured', 'refunded') THEN
      RAISE EXCEPTION 'Refund target does not match a captured payment' USING ERRCODE = '22023';
    END IF;
  ELSE
    PERFORM 1 FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND
      OR p_payment_id IS NOT NULL
      OR p_amount_paisa IS NOT NULL
      OR p_currency IS NOT NULL
      OR (p_operation_type = 'cancel_order' AND p_provider_target_type <> 'order')
      OR (p_operation_type = 'cancel_shipment' AND p_provider_target_type <> 'awb') THEN
      RAISE EXCEPTION 'Shiprocket cancellation request is invalid' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT * INTO v_operation
  FROM provider_operations
  WHERE provider = p_provider
    AND operation_type = p_operation_type
    AND business_key = BTRIM(p_business_key)
  FOR UPDATE;

  IF FOUND THEN
    IF v_operation.order_id <> p_order_id
      OR v_operation.payment_id IS DISTINCT FROM p_payment_id
      OR v_operation.provider_target_type <> p_provider_target_type
      OR v_operation.provider_target_id <> BTRIM(p_provider_target_id)
      OR v_operation.amount_paisa IS DISTINCT FROM p_amount_paisa
      OR v_operation.currency IS DISTINCT FROM v_currency
      OR v_operation.request_hash <> p_request_hash
      OR v_operation.cause <> BTRIM(p_cause) THEN
      RAISE EXCEPTION 'Provider operation business key conflicts with its immutable request'
        USING ERRCODE = '23505';
    END IF;
    RETURN v_operation;
  END IF;

  IF p_provider = 'razorpay' THEN
    IF EXISTS (
      SELECT 1 FROM provider_operations
      WHERE payment_id = p_payment_id
        AND provider = 'razorpay'
        AND operation_type IN ('full_refund', 'partial_refund')
        AND state = 'provider_failed'
    ) THEN
      RAISE EXCEPTION 'A failed refund requires separate replacement authorization'
        USING ERRCODE = '55P03';
    END IF;
    IF p_operation_type = 'full_refund' THEN
      IF p_amount_paisa <> v_payment.amount_paisa THEN
        RAISE EXCEPTION 'Full refund must equal the captured amount' USING ERRCODE = '22023';
      END IF;
      IF EXISTS (
        SELECT 1 FROM provider_operations
        WHERE payment_id = p_payment_id
          AND provider = 'razorpay'
          AND operation_type = 'partial_refund'
      ) THEN
        RAISE EXCEPTION 'A full refund cannot follow a partial refund intent'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    SELECT COALESCE(SUM(amount_paisa), 0) INTO v_reserved_refunds
    FROM provider_operations
    WHERE payment_id = p_payment_id
      AND provider = 'razorpay'
      AND operation_type IN ('full_refund', 'partial_refund')
      AND local_applied_at IS NULL
      AND state IN (
        'prepared', 'dispatching', 'outcome_unknown', 'provider_pending',
        'provider_succeeded', 'manual_review'
      );

    IF v_payment.refunded_amount_paisa + v_reserved_refunds + p_amount_paisa
      > v_payment.amount_paisa THEN
      RAISE EXCEPTION 'Refund intents exceed the captured amount' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO provider_operations (
    id,
    provider,
    operation_type,
    business_key,
    order_id,
    payment_id,
    provider_target_type,
    provider_target_id,
    amount_paisa,
    currency,
    request_hash,
    idempotency_key,
    cause
  ) VALUES (
    v_operation_id,
    p_provider,
    p_operation_type,
    BTRIM(p_business_key),
    p_order_id,
    p_payment_id,
    p_provider_target_type,
    BTRIM(p_provider_target_id),
    p_amount_paisa,
    v_currency,
    p_request_hash,
    'muvira-' || REPLACE(v_operation_id::TEXT, '-', ''),
    BTRIM(p_cause)
  )
  ON CONFLICT (provider, operation_type, business_key) DO NOTHING
  RETURNING * INTO v_operation;

  IF NOT FOUND THEN
    SELECT * INTO v_operation
    FROM provider_operations
    WHERE provider = p_provider
      AND operation_type = p_operation_type
      AND business_key = BTRIM(p_business_key)
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider operation could not be prepared' USING ERRCODE = '40001';
  END IF;
  IF v_operation.order_id <> p_order_id
    OR v_operation.payment_id IS DISTINCT FROM p_payment_id
    OR v_operation.provider_target_type <> p_provider_target_type
    OR v_operation.provider_target_id <> BTRIM(p_provider_target_id)
    OR v_operation.amount_paisa IS DISTINCT FROM p_amount_paisa
    OR v_operation.currency IS DISTINCT FROM v_currency
    OR v_operation.request_hash <> p_request_hash
    OR v_operation.cause <> BTRIM(p_cause) THEN
    RAISE EXCEPTION 'Provider operation business key conflicts with its immutable request'
      USING ERRCODE = '23505';
  END IF;
  RETURN v_operation;
END;
$$;

CREATE OR REPLACE FUNCTION claim_provider_operation_dispatch(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_operation_id UUID
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_operation provider_operations%ROWTYPE;
BEGIN
  IF p_execution_scope <> 'provider_operation'
    OR p_execution_resource_id <> p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Provider operation lease identity is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  UPDATE provider_operations
  SET state = 'dispatching',
      dispatch_attempts = dispatch_attempts + 1,
      dispatch_started_at = NOW(),
      error_classification = NULL,
      manual_review_reason = NULL
  WHERE id = p_operation_id
    AND state = 'prepared'
    AND local_applied_at IS NULL
  RETURNING * INTO v_operation;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider operation is not dispatchable' USING ERRCODE = '55P03';
  END IF;
  RETURN v_operation;
END;
$$;

CREATE OR REPLACE FUNCTION record_provider_operation_result(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_operation_id UUID,
  p_state TEXT,
  p_provider_operation_id TEXT,
  p_provider_status TEXT,
  p_response_metadata JSONB,
  p_error_classification TEXT DEFAULT NULL,
  p_manual_review_reason TEXT DEFAULT NULL
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_operation provider_operations%ROWTYPE;
BEGIN
  IF p_execution_scope <> 'provider_operation'
    OR p_execution_resource_id <> p_operation_id::TEXT
    OR p_state NOT IN (
      'outcome_unknown', 'provider_pending', 'provider_succeeded',
      'provider_failed', 'manual_review'
    )
    OR p_response_metadata IS NULL
    OR JSONB_TYPEOF(p_response_metadata) <> 'object'
    OR (p_state = 'manual_review' AND NULLIF(BTRIM(p_manual_review_reason), '') IS NULL) THEN
    RAISE EXCEPTION 'Provider result is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_operation FROM provider_operations WHERE id = p_operation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider operation not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_operation.local_applied_at IS NOT NULL THEN
    RETURN v_operation;
  END IF;
  IF v_operation.state IN ('provider_succeeded', 'provider_failed', 'manual_review') THEN
    IF v_operation.state = p_state THEN RETURN v_operation; END IF;
    RAISE EXCEPTION 'Terminal provider result cannot be changed' USING ERRCODE = '55P03';
  END IF;
  IF NOT (
    (v_operation.state = 'dispatching')
    OR (v_operation.state = 'outcome_unknown' AND p_state IN (
      'outcome_unknown', 'provider_pending', 'provider_succeeded', 'provider_failed', 'manual_review'
    ))
    OR (v_operation.state = 'provider_pending' AND p_state IN (
      'provider_pending', 'provider_succeeded', 'provider_failed', 'manual_review'
    ))
  ) THEN
    RAISE EXCEPTION 'Provider result transition is invalid' USING ERRCODE = '55P03';
  END IF;
  IF v_operation.provider_operation_id IS NOT NULL
    AND NULLIF(BTRIM(p_provider_operation_id), '') IS NOT NULL
    AND v_operation.provider_operation_id <> BTRIM(p_provider_operation_id) THEN
    RAISE EXCEPTION 'Provider result identity cannot be changed' USING ERRCODE = '22023';
  END IF;

  UPDATE provider_operations
  SET state = p_state,
      provider_operation_id = COALESCE(
        provider_operation_id,
        NULLIF(BTRIM(p_provider_operation_id), '')
      ),
      provider_status = COALESCE(NULLIF(BTRIM(p_provider_status), ''), provider_status),
      response_metadata = p_response_metadata,
      error_classification = NULLIF(BTRIM(p_error_classification), ''),
      manual_review_reason = CASE
        WHEN p_state = 'manual_review' THEN BTRIM(p_manual_review_reason)
        ELSE NULL
      END,
      reconciliation_attempts = reconciliation_attempts
        + CASE
          WHEN p_response_metadata->>'reconciliation' = 'no_match'
            OR state IN ('outcome_unknown', 'provider_pending')
            THEN 1
          ELSE 0
        END,
      last_reconciled_at = CASE
        WHEN p_response_metadata->>'reconciliation' = 'no_match'
          OR state IN ('outcome_unknown', 'provider_pending') THEN NOW()
        ELSE last_reconciled_at
      END,
      provider_completed_at = CASE
        WHEN p_state IN ('provider_succeeded', 'provider_failed') THEN NOW()
        ELSE provider_completed_at
      END
  WHERE id = p_operation_id
  RETURNING * INTO v_operation;
  RETURN v_operation;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_provider_operation(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_operation_id UUID,
  p_provider_target_type TEXT,
  p_provider_target_id TEXT,
  p_payment_id UUID,
  p_amount_paisa INTEGER,
  p_currency TEXT,
  p_request_hash TEXT
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operation provider_operations%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_order orders%ROWTYPE;
  v_old_status TEXT;
BEGIN
  IF p_execution_scope <> 'provider_operation'
    OR p_execution_resource_id <> p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Provider operation lease identity is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_operation FROM provider_operations WHERE id = p_operation_id FOR UPDATE;
  IF NOT FOUND OR v_operation.state <> 'provider_succeeded' THEN
    RAISE EXCEPTION 'Provider success is not confirmed' USING ERRCODE = '22023';
  END IF;
  IF v_operation.provider_target_type <> p_provider_target_type
    OR v_operation.provider_target_id <> BTRIM(p_provider_target_id)
    OR v_operation.payment_id IS DISTINCT FROM p_payment_id
    OR v_operation.amount_paisa IS DISTINCT FROM p_amount_paisa
    OR v_operation.currency IS DISTINCT FROM (
      CASE WHEN p_currency IS NULL THEN NULL ELSE UPPER(BTRIM(p_currency)) END
    )
    OR v_operation.request_hash <> p_request_hash THEN
    RAISE EXCEPTION 'Provider finalization request mismatch' USING ERRCODE = '22023';
  END IF;
  IF v_operation.local_applied_at IS NOT NULL THEN RETURN v_operation; END IF;

  IF v_operation.provider = 'razorpay' THEN
    SELECT * INTO v_payment FROM payments WHERE id = v_operation.payment_id FOR UPDATE;
    IF NOT FOUND
      OR v_payment.order_id <> v_operation.order_id
      OR v_payment.razorpay_payment_id IS DISTINCT FROM v_operation.provider_target_id
      OR v_payment.currency <> v_operation.currency
      OR v_payment.status NOT IN ('captured', 'refunded')
      OR v_payment.refunded_amount_paisa + v_operation.amount_paisa > v_payment.amount_paisa THEN
      RAISE EXCEPTION 'Refund no longer matches the captured payment' USING ERRCODE = '22023';
    END IF;

    UPDATE payments
    SET refunded_amount_paisa = refunded_amount_paisa + v_operation.amount_paisa,
        status = CASE
          WHEN refunded_amount_paisa + v_operation.amount_paisa = amount_paisa
            THEN 'refunded'
          ELSE 'captured'
        END
    WHERE id = v_payment.id
    RETURNING * INTO v_payment;

    IF v_payment.refunded_amount_paisa = v_payment.amount_paisa THEN
      UPDATE orders
      SET status = CASE WHEN v_operation.preserve_order_state THEN status ELSE 'refunded' END,
          payment_status = 'refunded'
      WHERE id = v_operation.order_id
        AND payment_status IN ('paid', 'failed', 'refunded', 'pending');
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Order cannot accept refund' USING ERRCODE = '22023';
      END IF;
      INSERT INTO outbox_events (
        aggregate_type, aggregate_id, event_type, payload, deduplication_key
      ) VALUES (
        'order',
        v_operation.order_id,
        'order.refunded',
        JSONB_BUILD_OBJECT('order_id', v_operation.order_id),
        'order.refunded:' || v_operation.id::TEXT
      ) ON CONFLICT (deduplication_key) DO NOTHING;
    END IF;

    INSERT INTO payment_logs (payment_id, order_id, event_type, payload)
    VALUES (
      v_payment.id,
      v_operation.order_id,
      'refund_processed',
      JSONB_BUILD_OBJECT(
        'provider_operation_id', v_operation.id,
        'razorpay_refund_id', v_operation.provider_operation_id,
        'amount_paisa', v_operation.amount_paisa,
        'currency', v_operation.currency,
        'refunded_amount_paisa', v_payment.refunded_amount_paisa
      )
    );
  ELSE
    SELECT * INTO v_order FROM orders WHERE id = v_operation.order_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
    END IF;
    IF (
      v_operation.provider_target_type = 'order'
      AND v_order.shiprocket_order_id::TEXT IS DISTINCT FROM v_operation.provider_target_id
    ) OR (
      v_operation.provider_target_type = 'awb'
      AND BTRIM(v_order.awb_code) IS DISTINCT FROM v_operation.provider_target_id
    ) OR (
      v_operation.provider_generation IS NOT NULL
      AND v_operation.provider_generation IS DISTINCT FROM (
        v_order.shiprocket_order_id::TEXT || ':'
          || COALESCE(v_order.shipment_id::TEXT, 'unassigned')
      )
    ) THEN
      RAISE EXCEPTION 'Cancellation target no longer matches the frozen fulfillment identity'
        USING ERRCODE = '22023';
    END IF;
    v_old_status := v_order.status;
    IF v_old_status NOT IN ('cancelled', 'refunded') THEN
      UPDATE orders SET status = 'cancelled' WHERE id = v_operation.order_id;
      INSERT INTO order_status_history (order_id, old_status, new_status, source, metadata)
      VALUES (
        v_operation.order_id,
        v_old_status,
        'cancelled',
        'system',
        JSONB_BUILD_OBJECT(
          'provider_operation_id', v_operation.id,
          'provider_target_type', v_operation.provider_target_type,
          'provider_target_id', v_operation.provider_target_id
        )
      );
      INSERT INTO outbox_events (
        aggregate_type, aggregate_id, event_type, payload, deduplication_key
      ) VALUES (
        'order',
        v_operation.order_id,
        'order.cancelled',
        JSONB_BUILD_OBJECT('order_id', v_operation.order_id),
        'order.cancelled:' || v_operation.id::TEXT
      ) ON CONFLICT (deduplication_key) DO NOTHING;
    END IF;
  END IF;

  UPDATE provider_operations
  SET local_applied_at = NOW()
  WHERE id = v_operation.id
  RETURNING * INTO v_operation;
  UPDATE operational_alerts
  SET status = 'resolved', resolved_at = NOW()
  WHERE alert_type = 'provider_operation_local_pending'
    AND reference_id = v_operation.id::TEXT
    AND status <> 'resolved';
  RETURN v_operation;
END;
$$;

REVOKE ALL ON FUNCTION enforce_provider_operation_immutability()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION prepare_provider_operation(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_provider_operation_dispatch(TEXT, TEXT, UUID, BIGINT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_provider_operation_result(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finalize_provider_operation(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION prepare_provider_operation(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION claim_provider_operation_dispatch(TEXT, TEXT, UUID, BIGINT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION record_provider_operation_result(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION finalize_provider_operation(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, UUID, INTEGER, TEXT, TEXT
) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v43;

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
  v_latest_migration TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v43();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_relations
  FROM (VALUES ('provider_operations')) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;
  SELECT COALESCE(JSONB_AGG(relation || '.' || column_name), '[]'::JSONB)
  INTO v_missing_columns
  FROM (VALUES
    ('payments', 'refunded_amount_paisa'),
    ('provider_operations', 'provider_target_type'),
    ('provider_operations', 'provider_generation'),
    ('provider_operations', 'request_hash'),
    ('provider_operations', 'idempotency_key'),
    ('provider_operations', 'manual_review_reason'),
    ('provider_operations', 'preserve_order_state'),
    ('provider_operations', 'local_applied_at')
  ) AS expected(relation, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = expected.relation
      AND columns.column_name = expected.column_name
  );
  SELECT COALESCE(JSONB_AGG(signature), '[]'::JSONB) INTO v_missing_functions
  FROM (VALUES
    ('public.prepare_provider_operation(text,text,text,uuid,uuid,text,text,integer,text,text,text)'),
    ('public.claim_provider_operation_dispatch(text,text,uuid,bigint,uuid)'),
    ('public.record_provider_operation_result(text,text,uuid,bigint,uuid,text,text,text,jsonb,text,text)'),
    ('public.finalize_provider_operation(text,text,uuid,bigint,uuid,text,text,uuid,integer,text,text)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(signature) IS NULL;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_indexes
  FROM (VALUES
    ('provider_operations_actionable_idx'),
    ('provider_operations_order_idx'),
    ('provider_operations_payment_idx')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;
  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 44,
      'migration_version', v_latest_migration,
      'missing_relations', (v_contract->'missing_relations') || v_missing_relations,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'ready', v_latest_migration = '044'
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
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v43()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v43() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
