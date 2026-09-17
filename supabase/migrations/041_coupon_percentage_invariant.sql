BEGIN;

DO $$
DECLARE
  v_invalid_codes TEXT;
BEGIN
  SELECT STRING_AGG(code, ', ' ORDER BY code) INTO v_invalid_codes
  FROM coupons
  WHERE discount_type = 'percentage' AND discount_value > 100;

  IF v_invalid_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid percentage coupons must be corrected before migration: %', v_invalid_codes;
  END IF;
END;
$$;

ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_percentage_value_allowed;
ALTER TABLE coupons ADD CONSTRAINT coupons_percentage_value_allowed
  CHECK (discount_type <> 'percentage' OR discount_value <= 100);

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v40;

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
BEGIN
  v_contract := public.get_runtime_schema_status_v40();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.coupons'::REGCLASS
      AND conname = 'coupons_percentage_value_allowed'
  ) THEN
    v_missing_constraints := '["coupons.coupons_percentage_value_allowed"]'::JSONB;
  END IF;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 41,
      'migration_version', v_latest_migration,
      'missing_constraints', (v_contract->'missing_constraints') || v_missing_constraints,
      'ready',
        v_latest_migration = '041'
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

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v40()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v40() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
