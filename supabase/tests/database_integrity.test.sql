BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT no_plan();

SELECT ok(
  relation.relrowsecurity,
  FORMAT('%I has row-level security enabled', relation.relname)
)
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind = 'r'
ORDER BY relation.relname;

SELECT ok(
  has_table_privilege('service_role', relation.oid, 'SELECT')
    AND has_table_privilege('service_role', relation.oid, 'INSERT')
    AND has_table_privilege('service_role', relation.oid, 'UPDATE')
    AND has_table_privilege('service_role', relation.oid, 'DELETE'),
  FORMAT('service_role has runtime access to %I', relation.relname)
)
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind = 'r'
ORDER BY relation.relname;

SELECT ok(
  NOT has_table_privilege('anon', relation.oid, 'SELECT')
    AND NOT has_table_privilege('anon', relation.oid, 'INSERT')
    AND NOT has_table_privilege('anon', relation.oid, 'UPDATE')
    AND NOT has_table_privilege('anon', relation.oid, 'DELETE')
    AND NOT has_table_privilege('authenticated', relation.oid, 'SELECT')
    AND NOT has_table_privilege('authenticated', relation.oid, 'INSERT')
    AND NOT has_table_privilege('authenticated', relation.oid, 'UPDATE')
    AND NOT has_table_privilege('authenticated', relation.oid, 'DELETE'),
  FORMAT('browser roles have no direct privileges on %I', relation.relname)
)
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind = 'r'
ORDER BY relation.relname;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM UNNEST(COALESCE(procedure.proconfig, ARRAY[]::TEXT[])) AS setting
    WHERE setting LIKE 'search_path=public%'
      OR setting LIKE 'search_path=pg_catalog, public%'
  ),
  FORMAT('%I has a safe search path', procedure.proname)
)
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'public'
  AND procedure.prosecdef
ORDER BY procedure.proname;

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(procedure.proacl, acldefault('f', procedure.proowner))) AS acl
    WHERE acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  )
    AND NOT has_function_privilege('anon', procedure.oid, 'EXECUTE')
    AND (
      has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      = (procedure.proname = 'is_admin')
    )
    AND has_function_privilege('service_role', procedure.oid, 'EXECUTE'),
  FORMAT('%I exposes only its intended execution roles', procedure.proname)
)
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'public'
  AND procedure.prosecdef
ORDER BY procedure.proname;

SELECT ok(
  COALESCE(pg_get_expr(policy.polqual, policy.polrelid), '') <> 'true'
    AND COALESCE(pg_get_expr(policy.polwithcheck, policy.polrelid), '') <> 'true',
  FORMAT('%I.%I is not unconditional', relation.relname, policy.polname)
)
FROM pg_policy AS policy
JOIN pg_class AS relation ON relation.oid = policy.polrelid
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname IN ('public', 'storage')
  AND policy.polcmd <> 'r'
ORDER BY namespace.nspname, relation.relname, policy.polname;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::REGCLASS
      AND conname = expected.constraint_name
  ),
  FORMAT('%I is installed', expected.constraint_name)
)
FROM (
  VALUES
    ('orders_status_allowed'),
    ('orders_payment_status_allowed'),
    ('orders_fulfillment_status_allowed'),
    ('orders_fulfillment_step_allowed')
) AS expected(constraint_name);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = expected.table_name
      AND column_name = 'updated_at'
  ),
  FORMAT('%I has updated_at for its update trigger', expected.table_name)
)
FROM (VALUES ('webhook_events'), ('sync_jobs')) AS expected(table_name);

SELECT is(
  (public.get_runtime_schema_status()->>'contract_version')::INTEGER,
  40,
  'runtime schema contract reports version 40'
);

SELECT is(
  (public.get_runtime_schema_status()->>'migration_version')::TEXT,
  '040',
  'runtime schema contract reports the latest migration'
);

SELECT is(
  (public.get_runtime_schema_status()->>'ready')::BOOLEAN,
  TRUE,
  'runtime schema contract reports ready after migration replay'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::REGCLASS
      AND conname = 'orders_shiprocket_status_raw'
      AND PG_GET_CONSTRAINTDEF(oid) ILIKE '%char_length(shiprocket_status)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::REGCLASS
      AND conname IN ('orders_shiprocket_status_check', 'orders_shiprocket_status_allowed')
  ),
  'Shiprocket raw status uses the bounded contract instead of the legacy enumeration'
);

SELECT is(
  public.enqueue_retry_job(
    'razorpay_webhook',
    'webhook-dedup-test',
    '{"webhookId":"webhook-dedup-test"}'::JSONB,
    5
  ),
  public.enqueue_retry_job(
    'razorpay_webhook',
    'webhook-dedup-test',
    '{"webhookId":"webhook-dedup-test"}'::JSONB,
    5
  ),
  'active retry jobs are deduplicated by type and reference'
);

SELECT is(
  (SELECT COUNT(*)::INTEGER FROM public.claim_retry_jobs(10, 30)
    WHERE reference_id = 'webhook-dedup-test'),
  1,
  'an eligible retry job is claimed once'
);

SELECT is(
  (SELECT COUNT(*)::INTEGER FROM public.claim_retry_jobs(10, 30)
    WHERE reference_id = 'webhook-dedup-test'),
  0,
  'an active lease prevents a second claim'
);

UPDATE retry_jobs
SET lease_token = '11111111-1111-4111-8111-111111111111',
    lease_expires_at = NOW() - INTERVAL '1 second'
WHERE reference_id = 'webhook-dedup-test';

SELECT is(
  (SELECT COUNT(*)::INTEGER FROM public.claim_retry_jobs(10, 30)
    WHERE reference_id = 'webhook-dedup-test'
      AND lease_token <> '11111111-1111-4111-8111-111111111111'),
  1,
  'an expired lease is reclaimed with a new token'
);

SELECT is(
  public.complete_retry_job(
    (SELECT id FROM retry_jobs WHERE reference_id = 'webhook-dedup-test'),
    '11111111-1111-4111-8111-111111111111'
  ),
  FALSE,
  'a stale lease token cannot complete a reclaimed job'
);

SELECT is(
  public.complete_retry_job(
    (SELECT id FROM retry_jobs WHERE reference_id = 'webhook-dedup-test'),
    (SELECT lease_token FROM retry_jobs WHERE reference_id = 'webhook-dedup-test')
  ),
  TRUE,
  'the current lease owner can complete a retry job'
);

INSERT INTO retry_jobs (
  id, job_type, reference_id, payload, status, retry_count, next_retry_at,
  last_error, lease_token, claimed_at, lease_expires_at
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  'razorpay_webhook',
  'webhook-requeue-test',
  '{}',
  'dead',
  5,
  NOW() + INTERVAL '1 day',
  'failed before manual intervention',
  '33333333-3333-4333-8333-333333333333',
  NOW(),
  NOW() + INTERVAL '1 day'
);

SELECT isnt(
  public.requeue_retry_job('22222222-2222-4222-8222-222222222222'),
  NULL,
  'a dead retry job can be manually requeued'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM retry_jobs
    WHERE id = '22222222-2222-4222-8222-222222222222'
      AND status = 'pending'
      AND retry_count = 0
      AND last_error IS NULL
      AND lease_token IS NULL
      AND claimed_at IS NULL
      AND lease_expires_at IS NULL
      AND next_retry_at <= NOW()
  ),
  'manual requeue resets retry, error, lease, and schedule state'
);

SELECT * FROM finish();

ROLLBACK;
