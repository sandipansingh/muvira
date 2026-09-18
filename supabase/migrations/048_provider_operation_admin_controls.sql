BEGIN;

CREATE TABLE provider_operation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_operation_id UUID REFERENCES provider_operations (id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(action)) BETWEEN 1 AND 80),
  reason TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(reason)) BETWEEN 1 AND 1000),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'no_change', 'failed')),
  details JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (JSONB_TYPEOF(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX provider_operation_audit_log_operation_idx
  ON provider_operation_audit_log (provider_operation_id, created_at DESC);
CREATE INDEX provider_operation_audit_log_order_idx
  ON provider_operation_audit_log (order_id, created_at DESC);
CREATE INDEX provider_operations_manual_review_idx
  ON provider_operations (updated_at DESC)
  WHERE state = 'manual_review';
CREATE INDEX provider_operations_local_pending_idx
  ON provider_operations (provider_completed_at)
  WHERE state = 'provider_succeeded' AND local_applied_at IS NULL;

ALTER TABLE provider_operation_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE provider_operation_audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE provider_operation_audit_log TO service_role;

CREATE OR REPLACE FUNCTION audit_provider_operation_action(
  p_operation_id UUID,
  p_order_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_outcome TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS provider_operation_audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_log provider_operation_audit_log%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL
    OR NULLIF(BTRIM(p_action), '') IS NULL
    OR NULLIF(BTRIM(p_reason), '') IS NULL
    OR p_outcome NOT IN ('success', 'no_change', 'failed')
    OR p_details IS NULL
    OR JSONB_TYPEOF(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Provider operation audit entry is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_operation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM provider_operations
    WHERE id = p_operation_id
      AND (p_order_id IS NULL OR order_id = p_order_id)
  ) THEN
    RAISE EXCEPTION 'Provider operation audit target does not match' USING ERRCODE = '22023';
  END IF;
  INSERT INTO provider_operation_audit_log (
    provider_operation_id,
    order_id,
    actor_id,
    action,
    reason,
    outcome,
    details
  ) VALUES (
    p_operation_id,
    p_order_id,
    p_actor_id,
    LEFT(BTRIM(p_action), 80),
    LEFT(BTRIM(p_reason), 1000),
    p_outcome,
    p_details
  ) RETURNING * INTO v_log;
  RETURN v_log;
END;
$$;

REVOKE ALL ON FUNCTION audit_provider_operation_action(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION audit_provider_operation_action(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB
) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v47;

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
  v_invalid_relation_grants JSONB := '[]'::JSONB;
  v_invalid_function_grants JSONB := '[]'::JSONB;
  v_invalid_rls_relations JSONB := '[]'::JSONB;
  v_latest_migration TEXT;
  v_relation TEXT;
  v_function REGPROCEDURE;
BEGIN
  v_contract := public.get_runtime_schema_status_v47();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_relations
  FROM (VALUES ('provider_operation_audit_log')) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;
  SELECT COALESCE(JSONB_AGG(signature), '[]'::JSONB) INTO v_missing_functions
  FROM (VALUES
    ('public.audit_provider_operation_action(uuid,uuid,uuid,text,text,text,jsonb)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(signature) IS NULL;
  SELECT COALESCE(JSONB_AGG(name), '[]'::JSONB) INTO v_missing_indexes
  FROM (VALUES
    ('provider_operation_audit_log_operation_idx'),
    ('provider_operation_audit_log_order_idx'),
    ('provider_operations_manual_review_idx'),
    ('provider_operations_local_pending_idx')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || name) IS NULL;

  FOREACH v_relation IN ARRAY ARRAY[
    'provider_operations',
    'retained_checkout_cases',
    'late_capture_watches',
    'retained_checkout_action_log',
    'provider_operation_audit_log'
  ] LOOP
    IF TO_REGCLASS('public.' || v_relation) IS NOT NULL AND (
      has_table_privilege('anon', 'public.' || v_relation, 'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated', 'public.' || v_relation, 'SELECT,INSERT,UPDATE,DELETE')
    ) THEN
      v_invalid_relation_grants := v_invalid_relation_grants || JSONB_BUILD_ARRAY(v_relation);
    END IF;
    IF TO_REGCLASS('public.' || v_relation) IS NOT NULL
      AND NOT (
        SELECT relrowsecurity FROM pg_class WHERE oid = TO_REGCLASS('public.' || v_relation)
      ) THEN
      v_invalid_rls_relations := v_invalid_rls_relations || JSONB_BUILD_ARRAY(v_relation);
    END IF;
  END LOOP;

  FOREACH v_function IN ARRAY ARRAY[
    TO_REGPROCEDURE('public.prepare_provider_operation(text,text,text,uuid,uuid,text,text,integer,text,text,text)'),
    TO_REGPROCEDURE('public.claim_provider_operation_dispatch(text,text,uuid,bigint,uuid)'),
    TO_REGPROCEDURE('public.record_provider_operation_result(text,text,uuid,bigint,uuid,text,text,text,jsonb,text,text)'),
    TO_REGPROCEDURE('public.finalize_provider_operation(text,text,uuid,bigint,uuid,text,text,uuid,integer,text,text)'),
    TO_REGPROCEDURE('public.authorize_razorpay_refund_retry(text,text,uuid,bigint,uuid)'),
    TO_REGPROCEDURE('public.prepare_shiprocket_cancellation(text,text,uuid,bigint,uuid,text)'),
    TO_REGPROCEDURE('public.assert_fulfillment_mutation_allowed(text,text,uuid,bigint,uuid)'),
    TO_REGPROCEDURE('public.release_retained_checkout_fenced(text,text,uuid,bigint,uuid,text,integer,text,text,text,uuid)'),
    TO_REGPROCEDURE('public.prepare_late_capture_refund_fenced(text,text,uuid,bigint,uuid,text,text,integer,text,text,text)'),
    TO_REGPROCEDURE('public.audit_provider_operation_action(uuid,uuid,uuid,text,text,text,jsonb)')
  ] LOOP
    IF v_function IS NOT NULL AND (
      has_function_privilege('anon', v_function, 'EXECUTE')
      OR has_function_privilege('authenticated', v_function, 'EXECUTE')
    ) THEN
      v_invalid_function_grants := v_invalid_function_grants
        || JSONB_BUILD_ARRAY(v_function::TEXT);
    END IF;
  END LOOP;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 48,
      'migration_version', v_latest_migration,
      'missing_relations', (v_contract->'missing_relations') || v_missing_relations,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'invalid_relation_grants',
        (v_contract->'invalid_relation_grants') || v_invalid_relation_grants,
      'invalid_function_grants',
        (v_contract->'invalid_function_grants') || v_invalid_function_grants,
      'invalid_rls_relations',
        (v_contract->'invalid_rls_relations') || v_invalid_rls_relations,
      'ready', v_latest_migration = '048'
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
        AND v_invalid_relation_grants = '[]'::JSONB
        AND v_invalid_function_grants = '[]'::JSONB
        AND v_invalid_rls_relations = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v47()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v47() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
