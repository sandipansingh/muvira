BEGIN;

ALTER TABLE provider_operations
  ADD COLUMN identical_retry_authorized_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION authorize_razorpay_refund_retry(
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
  SET state = 'prepared', identical_retry_authorized_at = NOW()
  WHERE id = p_operation_id
    AND provider = 'razorpay'
    AND operation_type IN ('full_refund', 'partial_refund')
    AND state = 'outcome_unknown'
    AND local_applied_at IS NULL
    AND dispatch_attempts = 1
    AND identical_retry_authorized_at IS NULL
    AND reconciliation_attempts > 0
    AND last_reconciled_at IS NOT NULL
    AND response_metadata->>'reconciliation' = 'no_match'
  RETURNING * INTO v_operation;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Razorpay refund retry is not authorized' USING ERRCODE = '55P03';
  END IF;
  RETURN v_operation;
END;
$$;

REVOKE ALL ON FUNCTION authorize_razorpay_refund_retry(TEXT, TEXT, UUID, BIGINT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION authorize_razorpay_refund_retry(TEXT, TEXT, UUID, BIGINT, UUID)
  TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v44;

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
  v_contract := public.get_runtime_schema_status_v44();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  SELECT COALESCE(JSONB_AGG(relation || '.' || column_name), '[]'::JSONB)
  INTO v_missing_columns
  FROM (VALUES
    ('provider_operations', 'identical_retry_authorized_at')
  ) AS expected(relation, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = expected.relation
      AND columns.column_name = expected.column_name
  );
  SELECT COALESCE(JSONB_AGG(signature), '[]'::JSONB) INTO v_missing_functions
  FROM (VALUES
    ('public.authorize_razorpay_refund_retry(text,text,uuid,bigint,uuid)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(signature) IS NULL;
  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 45,
      'migration_version', v_latest_migration,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'ready', v_latest_migration = '045'
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

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v44()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v44() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
