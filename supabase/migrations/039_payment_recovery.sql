BEGIN;

ALTER TABLE retry_jobs
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

UPDATE retry_jobs
SET
  status = 'pending',
  claimed_at = NULL,
  lease_token = NULL,
  lease_expires_at = NULL,
  next_retry_at = LEAST(next_retry_at, NOW()),
  last_error = COALESCE(last_error, 'Recovered from an unleased processing state')
WHERE status = 'processing';

WITH ranked_active_jobs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY job_type, reference_id
      ORDER BY created_at, id
    ) AS active_position
  FROM retry_jobs
  WHERE reference_id IS NOT NULL
    AND status IN ('pending', 'processing', 'failed')
)
UPDATE retry_jobs
SET
  status = 'dead',
  last_error = 'Superseded while enabling active-job deduplication',
  lease_token = NULL,
  claimed_at = NULL,
  lease_expires_at = NULL
FROM ranked_active_jobs
WHERE retry_jobs.id = ranked_active_jobs.id
  AND ranked_active_jobs.active_position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS retry_jobs_active_reference_unique
  ON retry_jobs (job_type, reference_id)
  WHERE reference_id IS NOT NULL
    AND status IN ('pending', 'processing', 'failed');

CREATE INDEX IF NOT EXISTS retry_jobs_expired_lease_idx
  ON retry_jobs (lease_expires_at, created_at)
  WHERE status = 'processing';

ALTER TABLE retry_jobs DROP CONSTRAINT IF EXISTS retry_jobs_job_type_check;
ALTER TABLE retry_jobs ADD CONSTRAINT retry_jobs_job_type_check
  CHECK (
    job_type IN (
      'webhook_process',
      'razorpay_webhook',
      'tracking_sync',
      'label_generate',
      'invoice_generate',
      'shiprocket_persist'
    )
    OR (job_type = 'notification' AND status IN ('completed', 'dead'))
  );

ALTER TABLE payment_reconciliation_cases
  ALTER COLUMN payment_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

UPDATE payment_reconciliation_cases AS reconciliation
SET
  razorpay_order_id = payments.razorpay_order_id,
  razorpay_payment_id = payments.razorpay_payment_id
FROM payments
WHERE payments.id = reconciliation.payment_id;

ALTER TABLE payment_reconciliation_cases
  DROP CONSTRAINT IF EXISTS payment_reconciliation_cases_reference_required;
ALTER TABLE payment_reconciliation_cases
  ADD CONSTRAINT payment_reconciliation_cases_reference_required
  CHECK (payment_id IS NOT NULL OR razorpay_order_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS payment_reconciliation_active_provider_order_unique
  ON payment_reconciliation_cases (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL AND status <> 'resolved';

CREATE OR REPLACE FUNCTION enqueue_retry_job(
  p_job_type TEXT,
  p_reference_id TEXT,
  p_payload JSONB,
  p_max_retries INTEGER DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  IF p_job_type IS NULL OR BTRIM(p_job_type) = '' THEN
    RAISE EXCEPTION 'Retry job type is required' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR JSONB_TYPEOF(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Retry job payload must be an object' USING ERRCODE = '22023';
  END IF;
  IF p_max_retries < 1 OR p_max_retries > 100 THEN
    RAISE EXCEPTION 'Retry count must be between 1 and 100' USING ERRCODE = '22023';
  END IF;

  INSERT INTO retry_jobs (job_type, reference_id, payload, max_retries)
  VALUES (p_job_type, NULLIF(BTRIM(p_reference_id), ''), p_payload, p_max_retries)
  ON CONFLICT (job_type, reference_id)
    WHERE reference_id IS NOT NULL
      AND status IN ('pending', 'processing', 'failed')
  DO UPDATE SET
    payload = EXCLUDED.payload,
    max_retries = GREATEST(retry_jobs.max_retries, EXCLUDED.max_retries),
    next_retry_at = CASE
      WHEN retry_jobs.status = 'processing' THEN retry_jobs.next_retry_at
      ELSE LEAST(retry_jobs.next_retry_at, NOW())
    END
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION claim_retry_jobs(
  p_limit INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF retry_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Claim limit must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Lease duration must be between 30 and 3600 seconds' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT retry_jobs.id
    FROM retry_jobs
    WHERE (
      status IN ('pending', 'failed')
      AND next_retry_at <= NOW()
    ) OR (
      status = 'processing'
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at <= NOW()
    )
    ORDER BY next_retry_at, created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE retry_jobs
  SET
    status = 'processing',
    lease_token = gen_random_uuid(),
    claimed_at = NOW(),
    lease_expires_at = NOW() + MAKE_INTERVAL(secs => p_lease_seconds)
  FROM claimable
  WHERE retry_jobs.id = claimable.id
  RETURNING retry_jobs.*;
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
  SET
    status = 'completed',
    lease_token = NULL,
    claimed_at = NULL,
    lease_expires_at = NULL,
    last_error = NULL
  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token;
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
  SET
    retry_count = retry_count + 1,
    status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead' ELSE 'pending' END,
    next_retry_at = CASE
      WHEN retry_count + 1 >= max_retries THEN next_retry_at
      ELSE NOW() + MAKE_INTERVAL(
        secs => LEAST(3600, (60 * POWER(2, retry_count + 1))::INTEGER)
      )
    END,
    last_error = LEFT(p_error, 2000),
    lease_token = NULL,
    claimed_at = NULL,
    lease_expires_at = NULL
  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retry job lease is no longer owned' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION requeue_retry_job(p_job_id UUID)
RETURNS retry_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job retry_jobs%ROWTYPE;
BEGIN
  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'Job is required' USING ERRCODE = '22023';
  END IF;

  UPDATE retry_jobs
  SET
    status = 'pending',
    retry_count = 0,
    next_retry_at = NOW(),
    last_error = NULL,
    lease_token = NULL,
    claimed_at = NULL,
    lease_expires_at = NULL
  WHERE id = p_job_id
    AND status IN ('dead', 'failed')
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION record_payment_reconciliation(
  p_order_id UUID,
  p_payment_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_reason TEXT
)
RETURNS payment_reconciliation_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case payment_reconciliation_cases%ROWTYPE;
BEGIN
  IF p_order_id IS NULL OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Order and reason are required' USING ERRCODE = '22023';
  END IF;
  IF p_payment_id IS NULL AND NULLIF(BTRIM(p_razorpay_order_id), '') IS NULL THEN
    RAISE EXCEPTION 'A local payment or provider order is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_payment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM payments WHERE id = p_payment_id AND order_id = p_order_id
  ) THEN
    RAISE EXCEPTION 'Payment does not belong to order' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_case
  FROM payment_reconciliation_cases
  WHERE status <> 'resolved'
    AND (
      (p_payment_id IS NOT NULL AND payment_id = p_payment_id)
      OR (
        NULLIF(BTRIM(p_razorpay_order_id), '') IS NOT NULL
        AND razorpay_order_id = BTRIM(p_razorpay_order_id)
      )
    )
  FOR UPDATE;

  IF FOUND THEN
    UPDATE payment_reconciliation_cases
    SET
      razorpay_payment_id = COALESCE(
        NULLIF(BTRIM(p_razorpay_payment_id), ''),
        payment_reconciliation_cases.razorpay_payment_id
      ),
      reason = LEFT(p_reason, 2000)
    WHERE id = v_case.id
    RETURNING * INTO v_case;
    RETURN v_case;
  END IF;

  INSERT INTO payment_reconciliation_cases (
    payment_id,
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    reason
  ) VALUES (
    p_payment_id,
    p_order_id,
    NULLIF(BTRIM(p_razorpay_order_id), ''),
    NULLIF(BTRIM(p_razorpay_payment_id), ''),
    LEFT(p_reason, 2000)
  )
  RETURNING * INTO v_case;
  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION enqueue_retry_job(TEXT, TEXT, JSONB, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_retry_jobs(INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_retry_job(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_retry_job(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION requeue_retry_job(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_payment_reconciliation(UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION enqueue_retry_job(TEXT, TEXT, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION claim_retry_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION complete_retry_job(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fail_retry_job(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION requeue_retry_job(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION record_payment_reconciliation(UUID, UUID, TEXT, TEXT, TEXT)
  TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v38;

CREATE OR REPLACE FUNCTION get_runtime_schema_status()
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
  v_latest_migration TEXT;
BEGIN
  v_contract := get_runtime_schema_status_v38();
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_columns
  FROM (VALUES
    ('retry_jobs.claimed_at'),
    ('retry_jobs.lease_expires_at'),
    ('retry_jobs.lease_token'),
    ('payment_reconciliation_cases.razorpay_order_id'),
    ('payment_reconciliation_cases.razorpay_payment_id')
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
    ('public.claim_retry_jobs(integer,integer)'),
    ('public.complete_retry_job(uuid,uuid)'),
    ('public.fail_retry_job(uuid,uuid,text)'),
    ('public.requeue_retry_job(uuid)'),
    ('public.record_payment_reconciliation(uuid,uuid,text,text,text)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(expected.signature) IS NULL;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_indexes
  FROM (VALUES
    ('retry_jobs_active_reference_unique'),
    ('retry_jobs_expired_lease_idx'),
    ('payment_reconciliation_active_provider_order_unique')
  ) AS expected(name)
  WHERE TO_REGCLASS('public.' || expected.name) IS NULL;

  RETURN (v_contract - 'ready' - 'contract_version' - 'migration_version')
    || JSONB_BUILD_OBJECT(
      'contract_version', 39,
      'migration_version', v_latest_migration,
      'missing_columns', (v_contract->'missing_columns') || v_missing_columns,
      'missing_functions', (v_contract->'missing_functions') || v_missing_functions,
      'missing_indexes', (v_contract->'missing_indexes') || v_missing_indexes,
      'ready',
        v_latest_migration = '039'
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
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status_v38()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status_v38() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
