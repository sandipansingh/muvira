# Admin revenue analytics rollout

Migration `057_admin_revenue_analytics.sql` adds a service-role-only analytics function and reporting indexes, then advances the structural contract to 057. It does not rewrite order, payment, reservation or provider-operation rows. Keep this checked-in migration unchanged; its SHA-256 is `23c8c2318ccbb02961f72fce33020ff39caf77a2d7c777b04900d0feffc201f3`.

The current final-mode API accepts contracts 056 and 057. Before 057, `/api/admin/dashboard/analytics` returns HTTP 503 with `SCHEMA_UPGRADE_REQUIRED`; the rest of the API remains compatible. The dashboard must present that upgrade state explicitly. Deploy this application revision before applying 057 so the previous API cannot reject the new contract.

## Application gate before migration

1. Complete repository checks, isolated clean replay, and `pnpm run test:upgrade`. Merge the verified feature into `main`, push `main`, and wait for all CI jobs on that exact commit to pass. Record the full commit SHA.
2. Fast-forward the existing `deploy` branch to that exact `main` commit and push it. Record the Dokploy deployment ID, source commit and resulting API/client image digests. Wait for that deployment to finish successfully and for the active containers to be healthy; a queued build or healthy older deployment does not satisfy this gate.
3. Confirm deployment metadata identifies the exact recorded commit and that the active containers use its recorded images. Check `/api/health/ready` from the new API container and through the public route: HTTP 200, workers `ok`, database contract `compatible`, expected version 56, reported version 56, and `supported_versions` containing both 56 and 57. The health JSON alone does not identify a Git commit, so retain both the deployment/image evidence and readiness response.
4. Verify the authenticated admin workspace loads and shows the explicit analytics upgrade state. Confirm commerce readiness separately with `/api/health/commerce`; preserve existing provider credentials, pickup settings, origins and SEO configuration.

Stop before the migration if the exact-commit deployment, container health or readiness check fails. Keep the previous application image references and database backup/recovery point in the deployment record.

## Migration gate and command

Use the production-linked checkout only after the application gate passes. Verify the linked project reference in `supabase/.temp/project-ref` equals `mmpsquheiibatsjficwm` and the runtime API uses `https://mmpsquheiibatsjficwm.supabase.co`. Do not print service-role keys or provider secrets.

Inspect remote migration history and the pending migration without applying it:

```sh
pnpm --filter server exec supabase migration list --workdir .. --linked
pnpm --filter server exec supabase db push --workdir .. --linked --dry-run
```

The deployed history must end at 056, and the dry run must propose only `057_admin_revenue_analytics.sql`. Stop and reconcile any differing history. Then apply the existing migration:

```sh
pnpm run db:migrate --project-ref mmpsquheiibatsjficwm --runtime-url https://mmpsquheiibatsjficwm.supabase.co
```

With pnpm, pass the flags directly after `db:migrate`. An extra standalone `--` is forwarded to the guard script and rejected. The guard verifies the explicit reference, runtime host and linked checkout before invoking linked `db push`.

## Verification after migration

1. Run the read-only migration list again: local and remote histories must include 057 with no pending migrations. From a trusted service-role session, call `get_runtime_schema_status()`: `contract_version=57`, `migration_version="057"`, `ready=true`, and all `missing_*`/`invalid_*` arrays empty. Verify analytics execution is denied to anonymous and authenticated database roles and allowed only to the service role.
2. Verify the same recorded deployment remains healthy. `/api/health/ready` must return HTTP 200 with expected version 56, reported version 57 and both versions still supported; workers stay `ok`. Check commerce readiness separately.
3. Use the authenticated admin analytics endpoint for day/week/month/year. Verify INR integer-paisa summaries, `Asia/Kolkata` boundaries, matching bucket/summary totals, comparable previous windows and visible data-quality warnings. Use existing records for reconciliation; do not create payment/refund/provider activity as a deployment probe. Guest/customer requests remain 401/403.
4. Review structured logs for schema errors, failed checkout inspections, stale leases and new operational alerts. Check existing retained cases and retry/reconciliation queues; deployment success does not establish live-provider acceptance or 24-hour monitoring.

If migration execution loses its response, inspect remote history and the runtime contract before retrying. If 057 committed, do not edit or reapply its SQL manually. Application rollback must use a revision verified compatible with both 056 and 057; do not reverse additive schema changes, captured payments or provider operations.

The command behavior and isolation options follow the [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push). Local integration fixtures require loopback HTTP plus `SUPABASE_TEST_ISOLATED_LOCAL=true`; never run destructive fixture suites against this production project.
