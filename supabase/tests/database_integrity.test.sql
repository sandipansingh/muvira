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

SELECT * FROM finish();

ROLLBACK;
