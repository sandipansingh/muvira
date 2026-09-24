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
- Corepack with pnpm 12.5.1
- Docker, only when running the local Supabase stack

Install all three workspaces:

```bash
corepack enable
pnpm install
```

Create local environment files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Set the Supabase, Razorpay test-mode, Shiprocket, and Resend values in those files. The frontend and backend Supabase URL/anonymous key pairs must identify the same project.

Start the local database and replay every migration:

```bash
pnpm run db:start
pnpm run db:reset
```

Start the client and API:

```bash
pnpm run dev
```

- Storefront: `http://localhost:5173`
- API: `http://localhost:4000`
- Liveness: `http://localhost:4000/api/health`
- Readiness: `http://localhost:4000/api/health/ready`

Stop the local Supabase stack with `pnpm run db:stop`.

## Quality commands

```bash
pnpm run lint
pnpm run lint:fix
pnpm run format:check
pnpm run format
pnpm run type-check
pnpm run build
pnpm test
```

`pnpm test` builds both services, runs provider-fixture and order-state tests, and verifies critical frontend/backend and migration contracts. The database authorization and HTTP API integration tests run when `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY` are supplied; CI provides them from an isolated local Supabase instance. CI also verifies both a clean migration replay and an additive upgrade from migration 025.

## Database releases

Never edit a migration that has already shipped. Add the next numbered migration under `supabase/migrations/`, verify an upgrade in staging, and then run the explicit release command from a trusted environment:

```bash
pnpm run db:migrate
```

This command pushes migrations to the linked Supabase project. Review its target before running it. Application deployment must wait for the migration step to succeed and for `/api/health/ready` to return HTTP 200.

Generated schema dumps are intentionally untracked because the previous snapshot drifted from the migration chain and retained unsafe legacy grants. Produce a temporary dump only from a database that has successfully replayed all migrations; never use a dump as the migration runner.

## Production deployment

### Docker Compose on Dokploy

The root `docker-compose.yml` builds both services from the repository root. Use a **Docker Compose** service in Dokploy, not a Docker Stack service (Stack cannot build images):

1. Select this Git repository and production branch. Set the Compose path to `./docker-compose.yml` and leave the base/build directory at the repository root (`./`, not `client/` or `server/`). Enable **Isolated Deployments** so both services share Dokploy's isolated network.
2. In the Compose service's **Environment** tab, enter the values from root `.env.example`, replacing every placeholder. A local root `.env.production` can combine the client and server production values, but it is Git-ignored and must never be committed. Enter its values in Dokploy securely; do not upload it to Git. If a value contains `$`, single-quote it in the Compose environment editor to prevent interpolation.
3. Set `VITE_API_URL` to the public HTTPS API origin, `VITE_AUTH_REDIRECT_URL` to the public HTTPS storefront origin, and `ALLOWED_ORIGINS` to include the storefront origin. Do not use `http://server:4000` for `VITE_API_URL`: the browser must reach the API domain. The `VITE_*` values are embedded during the client image build, so changing them requires a rebuild and redeploy.
4. In **Domains**, add the storefront hostname to service `client`, container port `80`; add the API hostname to service `server`, container port `4000`. Enable HTTPS for both and point their DNS records to Dokploy. Use **Preview Compose** to confirm both domain routes before deployment. No host port mapping or hand-written Traefik labels are needed.
5. Apply any required Supabase migration separately, then deploy. Verify the storefront and `https://<api-host>/api/health/ready` return successfully. Update the allowed Supabase Auth redirect URL and provider webhook URLs to the public HTTPS domains. Once this Compose deployment is verified, stop the old standalone client/server applications to avoid duplicate API workers and webhook processing.

For direct Docker Compose deployment outside Dokploy, create an ignored root `.env.production` from `.env.example`, then run `docker compose --env-file .env.production up -d --build`. The services expose only internal container ports; attach a reverse proxy or configure host port mappings separately for direct access. Avoid printing `docker compose config` to logs because it expands secrets; use `docker compose --env-file .env.production config --quiet` for validation.

The API container probes `/api/health/ready`; the client probes `/healthz`. The client waits for API readiness, so if the database schema or required provider settings are incomplete, inspect the server logs and resolve the configuration before expecting the storefront to start.

For deployments without Compose, deploy two services from the same revision:

1. API: use root `nixpacks.toml` or build `server/Dockerfile` from the repository root; expose port 4000 and probe `/api/health/ready`.
2. Client: use `client/nixpacks.toml` from the repository root or build `client/Dockerfile` from the repository root; configure `VITE_API_URL` with the API origin before building.

Keep the repository root as the build context for both services so `pnpm-workspace.yaml` and `pnpm-lock.yaml` are available. Point the client service at `client/nixpacks.toml` when using Nixpacks.

Run `pnpm run db:migrate` before promoting the API. Do not run migrations from an application startup command.

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
