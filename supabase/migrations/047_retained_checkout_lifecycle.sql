BEGIN;

CREATE TABLE retained_checkout_cases (
  order_id UUID PRIMARY KEY REFERENCES orders (id),
  state TEXT NOT NULL DEFAULT 'active' CHECK (
    state IN ('active', 'resolved_captured', 'resolved_unpaid', 'released_watch')
  ),
  escalation TEXT NOT NULL DEFAULT 'warning' CHECK (escalation IN ('warning', 'critical')),
  retention_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_deadline_at TIMESTAMPTZ NOT NULL,
  extension_count INTEGER NOT NULL DEFAULT 1 CHECK (extension_count BETWEEN 1 AND 96),
  last_provider_status TEXT NOT NULL,
  last_provider_amount_paid INTEGER NOT NULL DEFAULT 0 CHECK (last_provider_amount_paid >= 0),
  last_provider_currency TEXT NOT NULL CHECK (last_provider_currency ~ '^[A-Z]{3}$'),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolution_type TEXT CHECK (
    resolution_type IS NULL
    OR resolution_type IN ('captured', 'terminal_unpaid', 'hard_deadline', 'admin_release')
  ),
  resolution_actor_id UUID REFERENCES profiles (id) ON DELETE SET NULL,
  resolution_reason TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT retained_checkout_fixed_deadline
    CHECK (retention_deadline_at = retention_started_at + INTERVAL '24 hours'),
  CONSTRAINT retained_checkout_resolution_shape CHECK (
    (state = 'active' AND resolved_at IS NULL AND resolution_type IS NULL)
    OR (state <> 'active' AND resolved_at IS NOT NULL AND resolution_type IS NOT NULL)
  )
);

CREATE INDEX retained_checkout_cases_active_deadline_idx
  ON retained_checkout_cases (retention_deadline_at)
  WHERE state = 'active';

CREATE TABLE late_capture_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (id),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments (id),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  expected_amount_paisa INTEGER NOT NULL CHECK (expected_amount_paisa > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'refund_prepared', 'refunded', 'manual_review')
  ),
  last_provider_status TEXT,
  last_provider_payment_id TEXT,
  last_checked_at TIMESTAMPTZ,
  provider_operation_id UUID UNIQUE REFERENCES provider_operations (id),
  reason TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(reason)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX late_capture_watches_open_idx
  ON late_capture_watches (updated_at)
  WHERE status IN ('open', 'refund_prepared', 'manual_review');

CREATE TABLE retained_checkout_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id),
  actor_id UUID REFERENCES profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('worker_recheck', 'admin_recheck', 'admin_release', 'deadline_release')),
  reason TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(reason)) BETWEEN 1 AND 1000),
  provider_status TEXT NOT NULL,
  provider_amount_paid INTEGER NOT NULL CHECK (provider_amount_paid >= 0),
  provider_currency TEXT NOT NULL CHECK (provider_currency ~ '^[A-Z]{3}$'),
  outcome TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(outcome)) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX retained_checkout_action_log_order_idx
  ON retained_checkout_action_log (order_id, created_at DESC);

ALTER TABLE retained_checkout_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_capture_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE retained_checkout_action_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE retained_checkout_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE late_capture_watches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE retained_checkout_action_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE retained_checkout_cases TO service_role;
GRANT ALL ON TABLE late_capture_watches TO service_role;
GRANT ALL ON TABLE retained_checkout_action_log TO service_role;

CREATE TRIGGER retained_checkout_cases_set_updated_at
  BEFORE UPDATE ON retained_checkout_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER late_capture_watches_set_updated_at
  BEFORE UPDATE ON late_capture_watches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION retain_payable_checkout_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_provider_status TEXT,
  p_provider_amount_paid INTEGER,
  p_provider_currency TEXT,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case retained_checkout_cases%ROWTYPE;
  v_order orders%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_next_count INTEGER;
  v_severity TEXT;
BEGIN
  IF p_execution_scope <> 'checkout_payment'
    OR p_execution_resource_id <> p_order_id::TEXT
    OR NULLIF(BTRIM(p_provider_status), '') IS NULL
    OR p_provider_amount_paid < 0
    OR UPPER(BTRIM(p_provider_currency)) !~ '^[A-Z]{3}$'
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Checkout retention request is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND
    OR v_order.status <> 'pending'
    OR v_order.payment_status <> 'pending'
    OR v_payment.razorpay_order_id IS NULL
    OR v_payment.currency <> UPPER(BTRIM(p_provider_currency)) THEN
    RAISE EXCEPTION 'Checkout is not eligible for retention' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_case FROM retained_checkout_cases WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO retained_checkout_cases (
      order_id,
      retention_started_at,
      retention_deadline_at,
      extension_count,
      last_provider_status,
      last_provider_amount_paid,
      last_provider_currency,
      last_verified_at
    ) VALUES (
      p_order_id,
      NOW(),
      NOW() + INTERVAL '24 hours',
      1,
      BTRIM(p_provider_status),
      p_provider_amount_paid,
      UPPER(BTRIM(p_provider_currency)),
      NOW()
    ) RETURNING * INTO v_case;
  ELSE
    IF v_case.state <> 'active'
      OR NOW() >= v_case.retention_deadline_at
      OR v_case.extension_count >= 96 THEN
      RETURN FALSE;
    END IF;
    v_next_count := v_case.extension_count + 1;
    v_severity := CASE
      WHEN v_next_count >= 4
        OR NOW() >= v_case.retention_started_at + INTERVAL '1 hour'
        THEN 'critical'
      ELSE 'warning'
    END;
    UPDATE retained_checkout_cases
    SET extension_count = v_next_count,
        escalation = v_severity,
        last_provider_status = BTRIM(p_provider_status),
        last_provider_amount_paid = p_provider_amount_paid,
        last_provider_currency = UPPER(BTRIM(p_provider_currency)),
        last_verified_at = NOW()
    WHERE order_id = p_order_id
    RETURNING * INTO v_case;
  END IF;

  v_severity := CASE
    WHEN v_case.extension_count >= 4
      OR NOW() >= v_case.retention_started_at + INTERVAL '1 hour'
      THEN 'critical'
    ELSE 'warning'
  END;
  UPDATE retained_checkout_cases SET escalation = v_severity WHERE order_id = p_order_id;
  UPDATE orders
  SET checkout_expires_at = LEAST(NOW() + INTERVAL '15 minutes', v_case.retention_deadline_at)
  WHERE id = p_order_id AND status = 'pending' AND payment_status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout retention lost its business state' USING ERRCODE = '55P03';
  END IF;
  PERFORM persist_operational_alert(
    'payable_checkout_retained',
    v_severity,
    'checkout',
    p_order_id::TEXT,
    LEFT(BTRIM(p_reason), 2000),
    JSONB_BUILD_OBJECT(
      'razorpay_order_id', v_payment.razorpay_order_id,
      'provider_status', BTRIM(p_provider_status),
      'provider_amount_paid', p_provider_amount_paid,
      'provider_currency', UPPER(BTRIM(p_provider_currency)),
      'extension_count', v_case.extension_count,
      'retention_deadline_at', v_case.retention_deadline_at
    ),
    p_order_id,
    NULL
  );
  RETURN TRUE;
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
DECLARE v_currency TEXT;
BEGIN
  SELECT currency INTO v_currency FROM payments WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout payment not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN retain_payable_checkout_fenced(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token,
    p_order_id,
    p_provider_status,
    p_provider_amount_paid,
    v_currency,
    p_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_retained_checkout_action(
  p_order_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_provider_status TEXT,
  p_provider_amount_paid INTEGER,
  p_provider_currency TEXT,
  p_outcome TEXT
)
RETURNS retained_checkout_action_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_log retained_checkout_action_log%ROWTYPE;
BEGIN
  IF p_action NOT IN ('worker_recheck', 'admin_recheck', 'admin_release', 'deadline_release')
    OR NULLIF(BTRIM(p_reason), '') IS NULL
    OR NULLIF(BTRIM(p_provider_status), '') IS NULL
    OR p_provider_amount_paid < 0
    OR UPPER(BTRIM(p_provider_currency)) !~ '^[A-Z]{3}$'
    OR NULLIF(BTRIM(p_outcome), '') IS NULL THEN
    RAISE EXCEPTION 'Retained checkout action is invalid' USING ERRCODE = '22023';
  END IF;
  INSERT INTO retained_checkout_action_log (
    order_id,
    actor_id,
    action,
    reason,
    provider_status,
    provider_amount_paid,
    provider_currency,
    outcome
  ) VALUES (
    p_order_id,
    p_actor_id,
    p_action,
    BTRIM(p_reason),
    BTRIM(p_provider_status),
    p_provider_amount_paid,
    UPPER(BTRIM(p_provider_currency)),
    BTRIM(p_outcome)
  ) RETURNING * INTO v_log;
  RETURN v_log;
END;
$$;

CREATE OR REPLACE FUNCTION release_retained_checkout_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_provider_status TEXT,
  p_provider_amount_paid INTEGER,
  p_provider_currency TEXT,
  p_resolution_type TEXT,
  p_reason TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS late_capture_watches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case retained_checkout_cases%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_watch late_capture_watches%ROWTYPE;
BEGIN
  IF p_execution_scope <> 'checkout_payment'
    OR p_execution_resource_id <> p_order_id::TEXT
    OR p_resolution_type NOT IN ('hard_deadline', 'admin_release')
    OR NULLIF(BTRIM(p_reason), '') IS NULL
    OR NULLIF(BTRIM(p_provider_status), '') IS NULL
    OR p_provider_amount_paid < 0
    OR UPPER(BTRIM(p_provider_currency)) !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Retained checkout release is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_case FROM retained_checkout_cases WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_case.state <> 'active' THEN
    RAISE EXCEPTION 'Active retention case not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND
    OR v_payment.currency <> UPPER(BTRIM(p_provider_currency))
    OR v_payment.razorpay_order_id IS NULL THEN
    RAISE EXCEPTION 'Retained checkout payment does not match' USING ERRCODE = '22023';
  END IF;
  IF p_resolution_type = 'hard_deadline' AND NOW() < v_case.retention_deadline_at THEN
    RAISE EXCEPTION 'Retention hard deadline has not been reached' USING ERRCODE = '22023';
  END IF;
  IF NOT fail_checkout(p_order_id, LEFT(BTRIM(p_reason), 1000)) THEN
    RAISE EXCEPTION 'Retained checkout cannot be released' USING ERRCODE = '22023';
  END IF;

  INSERT INTO late_capture_watches (
    order_id,
    payment_id,
    razorpay_order_id,
    expected_amount_paisa,
    currency,
    last_provider_status,
    last_checked_at,
    reason
  ) VALUES (
    p_order_id,
    v_payment.id,
    v_payment.razorpay_order_id,
    v_payment.amount_paisa,
    v_payment.currency,
    BTRIM(p_provider_status),
    NOW(),
    LEFT(BTRIM(p_reason), 1000)
  )
  ON CONFLICT (order_id) DO UPDATE SET
    last_provider_status = EXCLUDED.last_provider_status,
    last_checked_at = NOW(),
    reason = EXCLUDED.reason
  RETURNING * INTO v_watch;

  UPDATE retained_checkout_cases
  SET state = 'released_watch',
      escalation = 'critical',
      last_provider_status = BTRIM(p_provider_status),
      last_provider_amount_paid = p_provider_amount_paid,
      last_provider_currency = UPPER(BTRIM(p_provider_currency)),
      last_verified_at = NOW(),
      resolution_type = p_resolution_type,
      resolution_actor_id = p_actor_id,
      resolution_reason = LEFT(BTRIM(p_reason), 1000),
      resolved_at = NOW()
  WHERE order_id = p_order_id;
  INSERT INTO retained_checkout_action_log (
    order_id, actor_id, action, reason, provider_status,
    provider_amount_paid, provider_currency, outcome
  ) VALUES (
    p_order_id,
    p_actor_id,
    CASE WHEN p_resolution_type = 'admin_release' THEN 'admin_release' ELSE 'deadline_release' END,
    BTRIM(p_reason),
    BTRIM(p_provider_status),
    p_provider_amount_paid,
    UPPER(BTRIM(p_provider_currency)),
    'released_watch'
  );
  UPDATE operational_alerts
  SET status = 'resolved', resolved_at = NOW()
  WHERE alert_type = 'payable_checkout_retained'
    AND reference_id = p_order_id::TEXT
    AND status <> 'resolved';
  PERFORM persist_operational_alert(
    'late_capture_watch',
    'critical',
    'checkout',
    p_order_id::TEXT,
    'Inventory was released while the provider payment outcome remains exposed',
    JSONB_BUILD_OBJECT(
      'razorpay_order_id', v_payment.razorpay_order_id,
      'provider_status', BTRIM(p_provider_status),
      'resolution_type', p_resolution_type
    ),
    p_order_id,
    NULL
  );
  RETURN v_watch;
END;
$$;

CREATE OR REPLACE FUNCTION prepare_late_capture_refund_fenced(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_amount_paisa INTEGER,
  p_currency TEXT,
  p_request_hash TEXT,
  p_reason TEXT
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_watch late_capture_watches%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_operation provider_operations%ROWTYPE;
  v_operation_id UUID := gen_random_uuid();
BEGIN
  IF p_execution_scope <> 'checkout_payment'
    OR p_execution_resource_id <> p_order_id::TEXT
    OR p_request_hash !~ '^[0-9a-f]{64}$'
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Late capture refund request is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_watch FROM late_capture_watches WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_watch.status = 'refunded' THEN
    RAISE EXCEPTION 'Open late capture watch not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND
    OR v_watch.payment_id <> v_payment.id
    OR v_watch.razorpay_order_id <> BTRIM(p_razorpay_order_id)
    OR v_watch.expected_amount_paisa <> p_amount_paisa
    OR v_watch.currency <> UPPER(BTRIM(p_currency)) THEN
    RAISE EXCEPTION 'Late capture does not match the released checkout' USING ERRCODE = '22023';
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
    cause,
    preserve_order_state
  ) VALUES (
    v_operation_id,
    'razorpay',
    'full_refund',
    'full-refund:' || v_payment.id::TEXT,
    p_order_id,
    v_payment.id,
    'payment',
    BTRIM(p_razorpay_payment_id),
    p_amount_paisa,
    UPPER(BTRIM(p_currency)),
    p_request_hash,
    'muvira-' || REPLACE(v_operation_id::TEXT, '-', ''),
    BTRIM(p_reason),
    TRUE
  )
  ON CONFLICT (provider, operation_type, business_key) DO NOTHING
  RETURNING * INTO v_operation;

  IF NOT FOUND THEN
    SELECT * INTO v_operation
    FROM provider_operations
    WHERE provider = 'razorpay'
      AND operation_type = 'full_refund'
      AND business_key = 'full-refund:' || v_payment.id::TEXT
    FOR UPDATE;
  END IF;
  IF NOT FOUND
    OR v_operation.provider_target_id <> BTRIM(p_razorpay_payment_id)
    OR v_operation.amount_paisa <> p_amount_paisa
    OR v_operation.currency <> UPPER(BTRIM(p_currency))
    OR v_operation.request_hash <> p_request_hash
    OR NOT v_operation.preserve_order_state THEN
    RAISE EXCEPTION 'Existing late-capture refund contract conflicts' USING ERRCODE = '23505';
  END IF;

  UPDATE payments
  SET razorpay_payment_id = BTRIM(p_razorpay_payment_id),
      status = 'captured',
      captured_at = COALESCE(captured_at, NOW()),
      failure_reason = NULL
  WHERE id = v_payment.id;
  UPDATE late_capture_watches
  SET status = 'refund_prepared',
      last_provider_status = 'captured',
      last_provider_payment_id = BTRIM(p_razorpay_payment_id),
      last_checked_at = NOW(),
      provider_operation_id = v_operation.id
  WHERE id = v_watch.id;
  RETURN v_operation;
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
DECLARE v_result JSONB; v_order_id UUID;
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  v_result := finalize_captured_payment(
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_razorpay_signature,
    p_amount_paisa,
    p_currency,
    p_payment_method
  );
  v_order_id := (v_result->'order'->>'id')::UUID;
  UPDATE retained_checkout_cases
  SET state = 'resolved_captured',
      resolution_type = 'captured',
      resolution_reason = 'Provider capture was verified',
      resolved_at = NOW(),
      last_provider_status = 'paid',
      last_provider_amount_paid = p_amount_paisa,
      last_provider_currency = UPPER(BTRIM(p_currency)),
      last_verified_at = NOW()
  WHERE order_id = v_order_id AND state = 'active';
  UPDATE operational_alerts
  SET status = 'resolved', resolved_at = NOW()
  WHERE alert_type = 'payable_checkout_retained'
    AND reference_id = v_order_id::TEXT
    AND status <> 'resolved';
  RETURN v_result;
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
DECLARE v_released BOOLEAN;
BEGIN
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  v_released := fail_checkout(p_order_id, p_reason);
  IF v_released THEN
    UPDATE retained_checkout_cases
    SET state = 'resolved_unpaid',
        resolution_type = 'terminal_unpaid',
        resolution_reason = LEFT(BTRIM(p_reason), 1000),
        resolved_at = NOW(),
        last_verified_at = NOW()
    WHERE order_id = p_order_id AND state = 'active';
    UPDATE operational_alerts
    SET status = 'resolved', resolved_at = NOW()
    WHERE alert_type = 'payable_checkout_retained'
      AND reference_id = p_order_id::TEXT
      AND status <> 'resolved';
  END IF;
  RETURN v_released;
END;
$$;

REVOKE ALL ON FUNCTION retain_payable_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_retained_checkout_action(
  UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_retained_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION prepare_late_capture_refund_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION retain_payable_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION record_retained_checkout_action(
  UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION release_retained_checkout_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION prepare_late_capture_refund_fenced(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT
) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v46;

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
  v_missing_functions JSONB;
  v_missing_indexes JSONB;
  v_latest_migration TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v46();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_relations
  FROM (VALUES
    ('retained_checkout_cases'),
    ('late_capture_watches'),
    ('retained_checkout_action_log')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;
  SELECT COALESCE(JSONB_AGG(signature), '[]'::JSONB) INTO v_missing_functions
  FROM (VALUES
    ('public.retain_payable_checkout_fenced(text,text,uuid,bigint,uuid,text,integer,text,text)'),
    ('public.record_retained_checkout_action(uuid,uuid,text,text,text,integer,text,text)'),
    ('public.release_retained_checkout_fenced(text,text,uuid,bigint,uuid,text,integer,text,text,text,uuid)'),
    ('public.prepare_late_capture_refund_fenced(text,text,uuid,bigint,uuid,text,text,integer,text,text,text)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(signature) IS NULL;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_indexes
  FROM (VALUES
    ('retained_checkout_cases_active_deadline_idx'),
    ('late_capture_watches_open_idx'),
    ('retained_checkout_action_log_order_idx')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;
  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 47,
      'migration_version', v_latest_migration,
      'missing_relations', (v_contract->'missing_relations') || v_missing_relations,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'ready', v_latest_migration = '047'
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
        AND v_missing_functions = '[]'::JSONB
        AND v_missing_indexes = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v46()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v46() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
