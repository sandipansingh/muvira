# Structure and types

## Repository layout

- `client/src/App.tsx` — React Router tree and route-level lazy loading
- `client/src/pages/` — storefront, auth, account, checkout, and order pages
- `client/src/pages/admin/` — authenticated admin operations pages
- `client/src/components/` — reusable components grouped by feature
- `client/src/lib/api/` — shared HTTP client
- `client/src/lib/services/` — frontend API wrappers
- `client/src/lib/types/` — established feature DTO and adapter types
- `client/src/types/` — cross-feature admin, checkout, notification, and provider contracts
- `server/src/modules/` — domain routes, validation schemas, controllers, and services
- `server/src/services/` — queues, polling, integrations, cache invalidation, metrics, and alerts
- `server/src/lib/` — provider and Supabase clients plus logging
- `server/src/types/` — API-wide request augmentation, database records, and shared contracts
- `supabase/migrations/` — ordered additive database changes
- `tests/` — unit, contract, and database-authorization tests

## Type rules

- Put domain-wide contracts in the existing shared type locations and import them. Do not duplicate order, product, checkout, payment, or admin shapes inside components.
- Local prop types and small function-local structural types may remain next to the implementation.
- Keep frontend DTO adapters explicit when API snake_case differs from UI camelCase.
- Keep Zod schemas at every request boundary and infer types from those schemas when practical.
- Avoid `any`; validate unknown provider and JSON payloads before narrowing them.
- Keep order, payment, fulfillment, and shipping unions synchronized with canonical database constraints.
- All monetary fields use the `_paisa` suffix and integer values at API/database boundaries.

## Database rules

- Migrations are append-only after check-in. Use the next numeric prefix.
- Use exact, stable names for constraints and indexes so later migrations can target them safely.
- Add preflight validation before tightening constraints over existing rows.
- Multi-record commerce changes belong in a transactional, service-role-only database function.
- RLS policies and grants must be tested with anonymous, customer, admin, and service-role identities.
- Generated schema dumps are untracked and are never a substitute for migration replay.
