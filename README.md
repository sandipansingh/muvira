# Muvira

Muvira is a React storefront and Express API backed by Supabase PostgreSQL, Auth, and Storage. Razorpay handles prepaid checkout, Shiprocket handles fulfillment and tracking, and Resend handles email notifications.

The client and API are deployed as separate services. Database migrations are an explicit pre-release step and are never run automatically by either service at startup.

## Architecture

- `client/` — Vite 8, React 19, React Router, Tailwind CSS 3, and Supabase Auth
- `server/` — Express 4 REST API, provider integrations, background workers, and privileged Supabase access
- `supabase/migrations/` — ordered PostgreSQL migrations; this is the database source of truth
- `tests/` — commerce unit tests, source-contract regressions, and local-Supabase authorization tests
- `.github/workflows/ci.yml` — quality checks and clean migration replay

The browser may use the Supabase anonymous key for Auth and approved Storage operations only. Commerce writes and administrative operations go through the Express API. The service-role key must never be exposed to the client.

## Local development

### Prerequisites

- Node.js 20.19 or newer
- npm
- Docker, only when running the local Supabase stack

Install all three workspaces:

```bash
npm install
```

Create local environment files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Set the Supabase, Razorpay test-mode, Shiprocket, and Resend values in those files. The frontend and backend Supabase URL/anonymous key pairs must identify the same project.

Start the local database and replay every migration:

```bash
npm run db:start
npm run db:reset
```

Start the client and API:

```bash
npm run dev
```

- Storefront: `http://localhost:5173`
- API: `http://localhost:4000`
- Liveness: `http://localhost:4000/api/health`
- Readiness: `http://localhost:4000/api/health/ready`

Stop the local Supabase stack with `npm run db:stop`.

## Quality commands

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run format
npm run type-check
npm run build
npm test
```

`npm test` builds both services, runs provider-fixture and order-state tests, and verifies critical frontend/backend and migration contracts. The database authorization and HTTP API integration tests run when `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY` are supplied; CI provides them from an isolated local Supabase instance. CI also verifies both a clean migration replay and an additive upgrade from migration 025.

## Database releases

Never edit a migration that has already shipped. Add the next numbered migration under `supabase/migrations/`, verify an upgrade in staging, and then run the explicit release command from a trusted environment:

```bash
npm run db:migrate
```

This command pushes migrations to the linked Supabase project. Review its target before running it. Application deployment must wait for the migration step to succeed and for `/api/health/ready` to return HTTP 200.

Generated schema dumps are intentionally untracked because the previous snapshot drifted from the migration chain and retained unsafe legacy grants. Produce a temporary dump only from a database that has successfully replayed all migrations; never use a dump as the migration runner.

## Production deployment

Deploy two services from the same revision:

1. API: use root `nixpacks.toml` or `server/Dockerfile`; expose port 4000 and probe `/api/health/ready`.
2. Client: use `client/nixpacks.toml` or `client/Dockerfile`; configure `VITE_API_URL` with the API origin before building.

Run `npm run db:migrate` before promoting the API. Do not run migrations from an application startup command.

Production startup validates mandatory Supabase, Razorpay, Shiprocket, CORS, and email configuration. Generic `.env` files do not override values already supplied by the platform or the environment-specific file.

### Provider setup

- Razorpay must use auto-capture. Configure `POST /api/webhooks/razorpay` for `payment.captured` and `payment.failed`, using the value in `RAZORPAY_WEBHOOK_SECRET`.
- Shiprocket fulfillment remains a manual admin operation. When webhook processing is enabled, configure a webhook URL ending in `/api/webhooks/shipment-status` and send `SHIPROCKET_WEBHOOK_SECRET` in the `x-api-key` header.
- Resend must authorize the `EMAIL_FROM` domain before production traffic is enabled.

Use Razorpay test mode and recorded Shiprocket payload fixtures in staging before enabling production provider credentials. Configure the protected GitHub `staging` environment secrets and run the manual `Staging provider smoke` workflow to verify API readiness and provider authentication without creating a payment or shipment.

## Operations

The API emits structured `commerce_operations` error logs every five minutes when it finds failed webhooks, dead retry/outbox/email jobs, failed invoices, unresolved payment reconciliation cases, expired inventory reservations, or Shiprocket remote-success/local-persistence retries. Configure the deployment platform to alert on that log field and on non-200 readiness responses.

The authenticated admin console is available at `/admin` for orders, fulfillment, catalog, coupons, settings, invoice operations, and failure diagnostics. Wishlist, newsletter capture, and customer return requests are intentionally out of scope and have no active UI or API.

## Secret handling

- Keep all real `.env*` files, Supabase service-role keys, provider secrets, and production data dumps out of Git.
- Rotate any credential that may have appeared in repository history.
- Treat historical `pay_custom_%` payment records as reconciliation cases; do not automatically delete or rewrite them.
- If production data was committed previously, coordinate a history rewrite separately from normal application commits.
