BEGIN;

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
    NEW.cause
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
    OLD.cause
  ) THEN
    RAISE EXCEPTION 'Provider operation request is immutable' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prepare_shiprocket_cancellation(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID,
  p_cause TEXT
)
RETURNS provider_operations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_operation provider_operations%ROWTYPE;
  v_operation_id UUID := gen_random_uuid();
  v_operation_type TEXT;
  v_target_type TEXT;
  v_target_id TEXT;
  v_generation TEXT;
  v_business_key TEXT;
  v_request_hash TEXT;
BEGIN
  IF p_execution_scope <> 'fulfillment_order'
    OR p_execution_resource_id <> p_order_id::TEXT
    OR NULLIF(BTRIM(p_cause), '') IS NULL THEN
    RAISE EXCEPTION 'Cancellation preparation is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.shiprocket_order_id IS NULL THEN
    RAISE EXCEPTION 'No Shiprocket order exists' USING ERRCODE = '22023';
  END IF;
  IF v_order.status IN ('delivered', 'returned', 'refunded') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled' USING ERRCODE = '22023';
  END IF;

  v_operation_type := CASE WHEN NULLIF(BTRIM(v_order.awb_code), '') IS NULL
    THEN 'cancel_order' ELSE 'cancel_shipment' END;
  v_target_type := CASE WHEN v_operation_type = 'cancel_order' THEN 'order' ELSE 'awb' END;
  v_target_id := CASE WHEN v_operation_type = 'cancel_order'
    THEN v_order.shiprocket_order_id::TEXT ELSE BTRIM(v_order.awb_code) END;
  v_generation := v_order.shiprocket_order_id::TEXT || ':'
    || COALESCE(v_order.shipment_id::TEXT, 'unassigned');
  v_business_key := 'shiprocket-cancel:' || p_order_id::TEXT || ':' || v_generation;
  v_request_hash := ENCODE(extensions.digest(
    'shiprocket|' || v_operation_type || '|' || p_order_id::TEXT || '|'
      || v_target_type || '|' || v_target_id || '|' || v_generation,
    'sha256'::TEXT
  ), 'hex');

  INSERT INTO provider_operations (
    id,
    provider,
    operation_type,
    business_key,
    order_id,
    provider_target_type,
    provider_target_id,
    provider_generation,
    request_hash,
    idempotency_key,
    cause
  ) VALUES (
    v_operation_id,
    'shiprocket',
    v_operation_type,
    v_business_key,
    p_order_id,
    v_target_type,
    v_target_id,
    v_generation,
    v_request_hash,
    'muvira-' || REPLACE(v_operation_id::TEXT, '-', ''),
    BTRIM(p_cause)
  )
  ON CONFLICT (provider, operation_type, business_key) DO NOTHING
  RETURNING * INTO v_operation;

  IF NOT FOUND THEN
    SELECT * INTO v_operation
    FROM provider_operations
    WHERE provider = 'shiprocket'
      AND operation_type = v_operation_type
      AND business_key = v_business_key
    FOR UPDATE;
  END IF;
  IF NOT FOUND
    OR v_operation.order_id <> p_order_id
    OR v_operation.provider_target_type <> v_target_type
    OR v_operation.provider_target_id <> v_target_id
    OR v_operation.provider_generation <> v_generation
    OR v_operation.request_hash <> v_request_hash
    OR v_operation.cause <> BTRIM(p_cause) THEN
    RAISE EXCEPTION 'Cancellation identity conflicts with its frozen target'
      USING ERRCODE = '23505';
  END IF;
  RETURN v_operation;
END;
$$;

CREATE OR REPLACE FUNCTION assert_fulfillment_mutation_allowed(
  p_execution_scope TEXT,
  p_execution_resource_id TEXT,
  p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_execution_scope <> 'fulfillment_order'
    OR p_execution_resource_id <> p_order_id::TEXT THEN
    RAISE EXCEPTION 'Fulfillment lease identity is invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM assert_execution_lease(
    p_execution_scope,
    p_execution_resource_id,
    p_execution_owner_token,
    p_execution_fencing_token
  );
  PERFORM 1 FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM provider_operations
    WHERE order_id = p_order_id
      AND provider = 'shiprocket'
      AND operation_type IN ('cancel_order', 'cancel_shipment')
      AND local_applied_at IS NULL
      AND state IN (
        'prepared', 'dispatching', 'outcome_unknown', 'provider_pending',
        'provider_succeeded', 'manual_review'
      )
  ) THEN
    RAISE EXCEPTION 'Fulfillment is frozen while cancellation is unresolved'
      USING ERRCODE = '55P03';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION prepare_shiprocket_cancellation(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION assert_fulfillment_mutation_allowed(
  TEXT, TEXT, UUID, BIGINT, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prepare_shiprocket_cancellation(
  TEXT, TEXT, UUID, BIGINT, UUID, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION assert_fulfillment_mutation_allowed(
  TEXT, TEXT, UUID, BIGINT, UUID
) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v45;

CREATE OR REPLACE FUNCTION public.get_runtime_schema_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contract JSONB;
  v_missing_columns JSONB;
  v_missing_functions JSONB;
  v_latest_migration TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v45();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  v_missing_columns := '[]'::JSONB;
  SELECT COALESCE(JSONB_AGG(signature), '[]'::JSONB) INTO v_missing_functions
  FROM (VALUES
    ('public.prepare_shiprocket_cancellation(text,text,uuid,bigint,uuid,text)'),
    ('public.assert_fulfillment_mutation_allowed(text,text,uuid,bigint,uuid)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(signature) IS NULL;
  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 46,
      'migration_version', v_latest_migration,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'ready', v_latest_migration = '046'
        AND v_contract->'missing_relations' = '[]'::JSONB
        AND v_contract->'missing_columns' = '[]'::JSONB
        AND v_contract->'missing_functions' = '[]'::JSONB
        AND v_contract->'invalid_relation_grants' = '[]'::JSONB
        AND v_contract->'invalid_function_grants' = '[]'::JSONB
        AND v_contract->'missing_constraints' = '[]'::JSONB
        AND v_contract->'invalid_rls_relations' = '[]'::JSONB
        AND v_contract->'missing_indexes' = '[]'::JSONB
        AND v_contract->'invalid_storage_capabilities' = '[]'::JSONB
        AND v_missing_columns = '[]'::JSONB
        AND v_missing_functions = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v45()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v45() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
