# Runtime schema readiness recovery — 2026-09-19

## Impact

The API readiness gate returned HTTP 503 and blocked commerce endpoints because the runtime database did not satisfy the schema contract expected by the current API build.

The database request failed with PostgREST error `PGRST202`: `public.get_runtime_schema_status()` was absent from the schema cache. The API correctly failed closed rather than serving requests against an incompatible schema.

## Root cause

The running API used Supabase project `mmpsquheiibatsjficwm`, while the local Supabase CLI checkout had been linked to `lzgbydlgoroyfgwymqhx`. The guarded migration command rejected that mismatch, so migrations intended for the runtime project were not pushed.

The current application contract is version 48 and requires migrations through `048_provider_operation_admin_controls.sql`. The readiness gate and checked-in migrations were correct; the deployment target state was not.

## Recovery

The checkout link was corrected to `mmpsquheiibatsjficwm`. The local database was rebuilt first to prove that every checked-in migration replays cleanly:

```sh
npm run db:start
npm run db:reset
npm run db:test
```

The database test suite passed all 313 checks. A direct local call to `public.get_runtime_schema_status()` returned:

```json
{
  "contract_version": 48,
  "migration_version": "048",
  "ready": true
}
```

All `missing_*` and `invalid_*` lists were empty.

After confirming the link and runtime URL referred to the same project, the guarded push was run:

```sh
npm run db:migrate -- \
  --project-ref mmpsquheiibatsjficwm \
  --runtime-url https://mmpsquheiibatsjficwm.supabase.co
```

Migrations `026` through `048` were applied. `supabase migration list --linked` then showed local and remote migrations aligned through `048`.

## Verification

The runtime RPC returned HTTP 200 with contract version 48, migration version `048`, `ready: true`, and empty missing/invalid lists.

The API process configured for the runtime project returned:

- `GET /api/health/ready` — HTTP 200, `status: "ready"`, expected and reported contract version 48.
- `GET /api/products?limit=1` — HTTP 200 with one product.

No readiness-gate, runtime-contract, or checked-in migration changes were required.
