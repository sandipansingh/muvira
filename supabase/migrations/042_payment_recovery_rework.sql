BEGIN;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS processing_token UUID,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_lease_expires_at TIMESTAMPTZ;

ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_processing_status_check;
ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_processing_status_check
  CHECK (
    processing_status IN (
      'received',
      'verified',
      'processing',
      'processed',
      'failed',
      'duplicate'
    )
  );

CREATE INDEX IF NOT EXISTS webhook_events_expired_processing_lease_idx
  ON webhook_events (processing_lease_expires_at, created_at)
  WHERE source = 'razorpay' AND processing_status = 'processing';

CREATE OR REPLACE FUNCTION claim_razorpay_webhook(
  p_webhook_id UUID,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF webhook_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_webhook_id IS NULL THEN
    RAISE EXCEPTION 'Webhook event is required' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT webhook_events.id
    FROM webhook_events
    WHERE webhook_events.id = p_webhook_id
      AND webhook_events.source = 'razorpay'
      AND (
        webhook_events.processing_status IN ('verified', 'failed')
        OR (
          webhook_events.processing_status = 'processing'
          AND webhook_events.processing_lease_expires_at IS NOT NULL
          AND webhook_events.processing_lease_expires_at <= NOW()
        )
      )
    FOR UPDATE SKIP LOCKED
  )
  UPDATE webhook_events
  SET
    processing_status = 'processing',
    processing_token = gen_random_uuid(),
    processing_started_at = NOW(),
    processing_lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds),
    error_message = NULL
  FROM claimable
  WHERE webhook_events.id = claimable.id
  RETURNING webhook_events.*;
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
  SET
    processing_status = 'processed',
    processed_at = NOW(),
    error_message = NULL,
    processing_token = NULL,
    processing_started_at = NULL,
    processing_lease_expires_at = NULL
  WHERE id = p_webhook_id
    AND source = 'razorpay'
    AND processing_status = 'processing'
    AND processing_token = p_processing_token;

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
  IF p_webhook_id IS NULL
    OR p_processing_token IS NULL
    OR NULLIF(BTRIM(p_error), '') IS NULL THEN
    RAISE EXCEPTION 'Webhook event, processing token, and error are required' USING ERRCODE = '22023';
  END IF;

  UPDATE webhook_events
  SET
    processing_status = 'failed',
    retry_count = retry_count + 1,
    processed_at = NOW(),
    error_message = LEFT(p_error, 2000),
    processing_token = NULL,
    processing_started_at = NULL,
    processing_lease_expires_at = NULL
  WHERE id = p_webhook_id
    AND source = 'razorpay'
    AND processing_status = 'processing'
    AND processing_token = p_processing_token;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION renew_razorpay_webhook_lease(
  p_webhook_id UUID,
  p_processing_token UUID,
  p_lease_seconds INTEGER DEFAULT 120
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
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  UPDATE webhook_events
  SET processing_lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds)
  WHERE id = p_webhook_id
    AND source = 'razorpay'
    AND processing_status = 'processing'
    AND processing_token = p_processing_token
    AND processing_lease_expires_at > NOW();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION renew_retry_job_lease(
  p_job_id UUID,
  p_lease_token UUID,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Job and lease token are required' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  UPDATE retry_jobs
  SET lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds)
  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
    AND lease_expires_at > NOW();

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION claim_razorpay_webhook(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_razorpay_webhook(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_razorpay_webhook(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION renew_razorpay_webhook_lease(UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION renew_retry_job_lease(UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION claim_razorpay_webhook(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION complete_razorpay_webhook(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fail_razorpay_webhook(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION renew_razorpay_webhook_lease(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION renew_retry_job_lease(UUID, UUID, INTEGER) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v41;

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
  v_missing_indexes JSONB;
  v_missing_constraints JSONB := '[]'::JSONB;
  v_latest_migration TEXT;
BEGIN
  v_contract := public.get_runtime_schema_status_v41();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_columns
  FROM (VALUES
    ('webhook_events.processing_lease_expires_at'),
    ('webhook_events.processing_started_at'),
    ('webhook_events.processing_token')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS actual
    WHERE actual.table_schema = 'public'
      AND expected.name = actual.table_name || '.' || actual.column_name
  );

  SELECT COALESCE(JSONB_AGG(expected.signature ORDER BY expected.signature), '[]'::JSONB)
  INTO v_missing_functions
  FROM (VALUES
    ('public.claim_razorpay_webhook(uuid,integer)'),
    ('public.complete_razorpay_webhook(uuid,uuid)'),
    ('public.fail_razorpay_webhook(uuid,uuid,text)'),
    ('public.renew_razorpay_webhook_lease(uuid,uuid,integer)'),
    ('public.renew_retry_job_lease(uuid,uuid,integer)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(expected.signature) IS NULL;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_indexes
  FROM (VALUES
    ('webhook_events_expired_processing_lease_idx')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || expected.name) IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.webhook_events'::REGCLASS
      AND conname = 'webhook_events_processing_status_check'
      AND PG_GET_CONSTRAINTDEF(oid) ILIKE '%processing%'
  ) THEN
    v_missing_constraints := '["webhook_events.webhook_events_processing_status_check"]'::JSONB;
  END IF;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 42,
      'migration_version', v_latest_migration,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'missing_constraints', (v_contract->'missing_constraints') || v_missing_constraints,
      'ready',
        v_latest_migration = '042'
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
        AND v_missing_indexes = '[]'::JSONB
        AND v_missing_constraints = '[]'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v41()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v41() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
