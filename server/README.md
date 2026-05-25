# Muvira Backend API

Production-grade e-commerce REST API for Muvira. Built with Node.js 20, TypeScript, Express, Supabase (PostgreSQL + Auth), and Razorpay.

---

## Prerequisites

- Node.js ≥ 20 LTS
- A Supabase project (free tier works)
- A Razorpay account (test keys work for development)
- (Optional) A Resend account for transactional email

---

## Setup

### 1. Install dependencies

```bash
cd muvira-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → service_role key (**keep secret**) |
| `RAZORPAY_KEY_ID` | Razorpay dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same page (**keep secret**) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard → Webhooks → your webhook → Secret |
| `ALLOWED_ORIGINS` | Comma-separated list of your frontend origins, e.g. `https://muvira.com,http://localhost:3000` |

### 3. Run database migrations

Install the Supabase CLI if you haven't:

```bash
npm install -g supabase
```

Link to your project and apply migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Alternatively, paste each file in `supabase/migrations/` into the Supabase SQL Editor and run them **in order** (001 → 011).

### 4. Start the development server

```bash
npm run dev
```

The server starts on `http://localhost:4000` (or the `PORT` in your `.env`).

### 5. Build for production

```bash
npm run build
npm start
```

---

## Authentication Boundary

**Supabase Auth handles signup and login directly.** This API does **not** proxy signup or token-issuance — those happen client-side via the Supabase client SDK.

Client flow:
1. User signs up / logs in via `supabase.auth.signUp()` or `supabase.auth.signInWithPassword()` on the **frontend**.
2. Supabase returns a JWT access token.
3. All subsequent calls to this API include `Authorization: Bearer <token>`.
4. This API verifies the token server-side on every authenticated request.

---

## API Reference

### Public routes (no auth)

```
GET  /api/health
GET  /api/products?page=1&limit=20&category=doll&minPrice=0&maxPrice=50000&inStock=true&sort=price_asc&q=search
GET  /api/products/:slug
GET  /api/products/:id/related
GET  /api/categories
GET  /api/categories/:slug
GET  /api/campaigns/active
```

### Authenticated user routes (`Authorization: Bearer <token>` required)

```
GET    /api/profile
PATCH  /api/profile

GET    /api/addresses
POST   /api/addresses
PATCH  /api/addresses/:id
DELETE /api/addresses/:id
POST   /api/addresses/:id/default

GET    /api/cart
POST   /api/cart
PATCH  /api/cart/:itemId
DELETE /api/cart/:itemId

POST   /api/checkout/apply          (coupon preview)
POST   /api/checkout/create-order   (creates Razorpay order + DB order)
POST   /api/payments/verify         (verifies payment signature, captures)

GET    /api/orders
GET    /api/orders/:id
```

### Webhook (signature-verified, not user-auth)

```
POST   /api/webhooks/razorpay
```

### Admin routes (`role = 'admin'` required)

```
GET    /api/admin/dashboard/stats

GET    /api/admin/inventory
GET    /api/admin/inventory/low-stock
PATCH  /api/admin/inventory/:id/stock

GET    /api/admin/products
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
POST   /api/admin/products/:id/images
DELETE /api/admin/products/:id/images/:imageId

GET    /api/admin/categories
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id

GET    /api/admin/coupons
POST   /api/admin/coupons
PATCH  /api/admin/coupons/:id
POST   /api/admin/coupons/:id/deactivate

GET    /api/admin/campaigns
POST   /api/admin/campaigns
PATCH  /api/admin/campaigns/:id
POST   /api/admin/campaigns/:id/toggle

GET    /api/admin/orders
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status
PATCH  /api/admin/orders/:id/fulfillment
POST   /api/admin/orders/:id/notes
```

---

## curl Examples

### Check health

```bash
curl http://localhost:4000/api/health
```

### List products

```bash
curl "http://localhost:4000/api/products?limit=5&sort=price_asc"
```

### Full checkout flow

**Step 1** — Get your JWT from Supabase (done client-side; here we simulate):
```bash
# Replace <TOKEN> with your Supabase JWT in all commands below
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Step 2** — Add a product to cart:
```bash
curl -X POST http://localhost:4000/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"<product-uuid>","quantity":2}'
```

**Step 3** — Create checkout order:
```bash
curl -X POST http://localhost:4000/api/checkout/create-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address_id":"<address-uuid>"}'
```

Response includes `razorpay_order_id`, `amount_paisa`, `key_id` — use these to open Razorpay Checkout in the frontend.

**Step 4** — After payment, frontend calls verify:
```bash
curl -X POST http://localhost:4000/api/payments/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "computed_hmac_xxx"
  }'
```

### Prove User A cannot access User B's order (403/404 isolation)

```bash
# Log in as User A, get TOKEN_A
# Log in as User B, get TOKEN_B

# Create an order as User B to get order_id_b
curl -X GET "http://localhost:4000/api/orders/<order_id_b>" \
  -H "Authorization: Bearer $TOKEN_A"
# Expected: 404 ORDER_NOT_FOUND — User A cannot see User B's order
```

### Admin-only route (non-admin gets 403)

```bash
# Log in as a regular user, get REGULAR_TOKEN
curl http://localhost:4000/api/admin/dashboard/stats \
  -H "Authorization: Bearer $REGULAR_TOKEN"
# Expected: 403 FORBIDDEN "Admin access required"
```

---

## Section 11 Checklist — Implementation Map

### Auth & Authorization

| Item | Where implemented |
|---|---|
| Every non-public route runs `requireAuth` | `src/app.ts` — applied per-router or via `router.use(requireAuth)` in each module |
| Identity from verified JWT only | `src/middleware/requireAuth.ts` — `adminSupabase.auth.getUser(token)`; user_id never read from req.body |
| Application-layer ownership check (Layer 2) | Every service function: `existing.user_id !== userId` before mutations; `getUserOrder` / `updateAddress` etc. |
| RLS on all user-data tables (Layer 1) | `supabase/migrations/003–010.sql` — `ENABLE ROW LEVEL SECURITY` + policies on every table |
| All `/admin/*` routes run `requireAdmin` | `src/app.ts` — `adminRouter.use(requireAuth, requireAdmin)` applied to the entire `adminRouter` |
| Multiple admins work | `requireAdmin` checks `role === 'admin'` — no hardcoded user ID anywhere |
| User A gets 404 reading User B's order | `orders/service.ts` → `getUserOrder` filters `.eq('user_id', userId)` — mismatch returns 404 |

### Payments

| Item | Where implemented |
|---|---|
| Server-computed amounts only | `checkout/service.ts` — cart re-fetched from DB, totals computed in code; schema `.strict()` rejects any amount field |
| HMAC-SHA256 + `timingSafeEqual` | `lib/razorpay/verifySignature.ts` — `crypto.timingSafeEqual`, never `===` |
| Webhook raw body + webhook secret | `app.ts` — `express.raw()` before `express.json()`; `verifyWebhookSignature` uses `RAZORPAY_WEBHOOK_SECRET` |
| Idempotent capture | `payments/service.ts` → `capturePayment` — checks `status === 'captured'` before proceeding |
| Atomic stock decrement | `payments/service.ts` → calls `decrement_stock` RPC (DB function with `WHERE stock >= qty`) |
| Atomic coupon increment | `payments/service.ts` → calls `increment_coupon_usage` RPC |
| `payment_logs` audit trail | Every event (created, verify_attempt, verify_success, verify_failure, webhook_*) logs a row |
| No direct payment capture endpoint | Only `verifyPayment` and `processRazorpayWebhook` call `capturePayment`; no other path touches it |

### Validation & Hardening

| Item | Where implemented |
|---|---|
| Zod on every route | All `schema.ts` files + `validate` middleware applied on all handlers |
| `.strict()` rejects unknown fields | All admin/write schemas use `.strict()` |
| Secrets in env only, never logged/returned | `env.ts`; `logger.ts` has redact paths; KEY_SECRET not in any response |
| `helmet`, CORS allow-list, rate limiting | `app.ts` — `helmet()`, `cors()` with `allowedOrigins`, three rate limiters |
| Centralized error handler hides internals | `middleware/errorHandler.ts` — production hides stack trace, shows generic message + requestId |
| Fail fast on missing env | `config/env.ts` — `process.exit(1)` on Zod failure at startup |

### Data Integrity

| Item | Where implemented |
|---|---|
| Integer paisa end-to-end | All amount columns are `INT` in migrations; `calculateTax` returns `number` (int); no floats used |
| Immutable order snapshots | `orders` table has shipping snapshot columns + product snapshot in `order_items`; no FK to `addresses` after creation |
| Collision-free order numbers | `generate_order_number()` uses a Postgres `SEQUENCE` — atomic under concurrency |

### Delivered Artifacts

| Item | Status |
|---|---|
| Runnable Node/TypeScript project | ✅ `package.json`, `tsconfig.json`, `src/`, `supabase/migrations/` |
| `.env.example` with all vars | ✅ |
| README with run instructions + curl examples | ✅ This file |
| No frontend code | ✅ Pure Express API — no React, no HTML, no Next.js |

---

## Project Structure

```
muvira-backend/
├─package.json
├─tsconfig.json
├─.env.example
├─.gitignore
├─README.md
├─supabase/
│   └─migrations/
│       ├─001_extensions.sql
│       ├─002_profiles.sql
│       ├─003_addresses.sql
│       ├─004_categories.sql
│       ├─005_products.sql
│       ├─006_cart.sql
│       ├─007_coupons.sql
│       ├─008_campaigns.sql
│       ├─009_orders.sql
│       ├─010_payments.sql
│       └─011_functions.sql
└─src/
    ├─config/env.ts
    ├─app.ts
    ├─server.ts
    ├─middleware/
    │   ├─requireAuth.ts
    │   ├─requireAdmin.ts
    │   ├─validate.ts
    │   ├─errorHandler.ts
    │   ├─rateLimit.ts
    │   └─requestId.ts
    ├─lib/
    │   ├─logger.ts
    │   ├─tax.ts
    │   ├─supabase/
    │   │   ├─client.ts
    │   │   └─admin.ts
    │   ├─razorpay/
    │   │   ├─client.ts
    │   │   └─verifySignature.ts
    │   └─notifications/
    │       └─email.ts
    ├─types/
    │   └─index.ts
    └─modules/
        ├─health/routes.ts
        ├─profile/{schema,service,controller,routes}.ts
        ├─addresses/{schema,service,controller,routes}.ts
        ├─products/{schema,service,controller,routes}.ts
        ├─categories/{schema,service,controller,routes}.ts
        ├─campaigns/{schema,service,controller,routes}.ts
        ├─cart/{schema,service,controller,routes}.ts
        ├─coupons/{schema,service,controller,routes}.ts
        ├─checkout/{schema,service,controller,routes}.ts
        ├─payments/{schema,service,controller,routes}.ts
        ├─orders/{schema,service,controller,routes}.ts
        └─admin/
            ├─dashboard/{schema,service,controller,routes}.ts
            └─inventory/{schema,service,controller,routes}.ts
```

---

## Security Notes

- **Never commit `.env`** — it's in `.gitignore`. Only `.env.example` is committed.
- The `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are **different secrets** and must be configured separately.
- JWT identity is always sourced from the verified token — never from `req.body`.
- All payment capture paths go through a single `capturePayment` function with an idempotency guard.
- Admin access is multi-user: set `profiles.role = 'admin'` via the Supabase dashboard (SQL editor) for any user.
