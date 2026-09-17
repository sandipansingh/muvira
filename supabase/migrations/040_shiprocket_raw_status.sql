BEGIN;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shiprocket_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shiprocket_status_allowed;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shiprocket_status_raw;
ALTER TABLE orders ADD CONSTRAINT orders_shiprocket_status_raw
  CHECK (
    shiprocket_status IS NULL
    OR (
      shiprocket_status = BTRIM(shiprocket_status)
      AND CHAR_LENGTH(shiprocket_status) BETWEEN 1 AND 120
    )
  );

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v39;

CREATE OR REPLACE FUNCTION public.get_runtime_schema_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contract JSONB;
  v_missing_constraints JSONB := '[]'::JSONB;
  v_latest_migration TEXT;
  v_constraint_definition TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v39();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;

  SELECT PG_GET_CONSTRAINTDEF(constraint_row.oid)
  INTO v_constraint_definition
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = 'public.orders'::REGCLASS
    AND constraint_row.conname = 'orders_shiprocket_status_raw';

  IF v_constraint_definition IS NULL
    OR v_constraint_definition NOT ILIKE '%char_length(shiprocket_status)%'
    OR v_constraint_definition ILIKE '%pending%created%failed%'
    OR EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.orders'::REGCLASS
        AND conname IN ('orders_shiprocket_status_check', 'orders_shiprocket_status_allowed')
    ) THEN
    v_missing_constraints := '["orders.orders_shiprocket_status_raw"]'::JSONB;
  END IF;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 40,
      'migration_version', v_latest_migration,
      'missing_constraints', (v_contract->'missing_constraints') || v_missing_constraints,
      'ready',
        v_latest_migration = '040'
        AND v_contract->'missing_relations' = '[]'::JSONB
        AND v_contract->'missing_columns' = '[]'::JSONB
        AND v_contract->'missing_functions' = '[]'::JSONB
        AND v_contract->'invalid_relation_grants' = '[]'::JSONB
        AND v_contract->'invalid_function_grants' = '[]'::JSONB
        AND v_contract->'missing_constraints' = '[]'::JSONB
        AND v_contract->'invalid_rls_relations' = '[]'::JSONB
        AND v_contract->'missing_indexes' = '[]'::JSONB
        AND v_contract->'invalid_storage_capabilities' = '[]'::JSONB
        AND v_missing_constraints = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v39()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v39() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
