# Shiprocket fulfillment and recovery

Shipping remains free to customers. Razorpay capture confirms payment; staff create shipments, choose couriers, and schedule collection. Scheduling collection does not mark an order shipped. Tracking confirms physical handoff and delivery.

## Configuration

Keep Shiprocket API-user credentials on the Express server in `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`. Create a dedicated API user in Shiprocket; these are API-user login credentials, not storefront credentials. Grant that user the order, shipment, courier/serviceability, AWB, pickup, document, tracking, cancellation, and NDR API permissions required by the account. Confirm access with Shiprocket account support if a documented API is unavailable on the account.

Select an existing registered pickup location in Store settings and save valid default package dimensions and weight. Its registered PIN is resolved through the provider. Product weights and quantities determine checkout weight; missing product weights use the configured per-item default. Staff see the frozen purchased package and can explicitly change it before fulfillment.

Set `SHIPROCKET_WEBHOOK_ENABLED=true` and a unique `SHIPROCKET_WEBHOOK_SECRET` of at least 16 characters in production. Register `https://<api-origin>/api/webhooks/shipment-status` and configure the same value as the `x-api-key` header. Keep the four existing environment names; do not put credentials or this secret in `VITE_*`, source control, logs, or browser configuration.

## Deployment

1. Back up the linked database and confirm the deployment target. Apply additive migrations 054, 055, and 056 in order using the repository migration workflow. Never edit migrations already deployed.
2. Deploy the dependent API and client after migrations. Final-mode readiness requires schema 56 and verifies private relations, grants, functions, constraints, and indexes. A schema mismatch must keep the API and workers unready.
3. Configure pickup/package defaults and authenticated webhooks. Verify readiness, provider read access, quote availability, diagnostics, and local workers. Fulfillment calls remain explicit admin actions.
4. Before live use, separately authorize a controlled real-provider validation. Local tests use synthetic orders and mocked provider mutations; they do not prove account permissions, courier allocation, actual pickup, delivery, cancellation, or NDR execution.

For local verification use a dedicated Supabase project and separate loopback ports. Run the normal migration replay, `supabase test db`, `pnpm test:integration` with the isolated-local test variables, and `node tests/verify-shipping-upgrade.cjs` with `SUPABASE_TEST_WORKDIR` pointing to that dedicated project. The upgrade test refuses the default development port and verifies 53→56 snapshot preservation. Do not use hosted credentials for tests.

## Checkout and courier selection

Address-free quotes are previews. Owned-address quotes check the registered pickup PIN, destination PIN, complete package, declared value, and selected method. Standard recommends the cheapest serviceable courier, breaking ties by estimate then courier ID. Express recommends the fastest courier with a known estimate, then price and ID. Unknown estimates remain unknown; Express is unavailable if no valid estimate exists.

Before new payment preparation, the server checks availability again. The reservation transaction compares the exact cart/address/package/settings/value/method fingerprint before stock reservation. Shipping unavailability or provider outages block new payment preparation. Existing payment sessions recover from their frozen order even if the cart, address, defaults, or provider availability later changes.

The short reservation transaction locks products and cart tables to prevent phantom cart changes. It performs no provider calls while holding those locks. This trades some checkout/catalog concurrency for a stable snapshot; revisit the locking strategy if checkout contention becomes measurable.

The admin courier lookup is `GET /api/admin/orders/:id/couriers`, optionally with validated pickup/package query overrides. Assignment rechecks availability. A nonrecommended available courier requires `courier_override_reason`; the authenticated actor and reason are audited.

## Durable operations

Creation, AWB assignment, pickup, and NDR use the existing provider-operation ledger with immutable requests in the private `shipping_operation_requests` relation. Requests never appear in operation DTOs. Leases fence dispatch and local application. Do not delete an operation/request or clear provider identifiers to retry a shipment.

- `prepared`: intent saved; a worker may dispatch it once.
- `dispatching` or `outcome_unknown`: a request may have reached Shiprocket. Reconciliation reads the provider; it does not repeat the mutation.
- `provider_succeeded` without `local_applied_at`: provider success is durable; reconciliation retries local application with payment, generation, and lease checks.
- `provider_pending` for NDR: request accepted. Shipment tracking determines the outcome. Accepted NDR records do not consume fulfillment/refund reconciliation batches.
- `manual_review`: reads could not conclusively establish the result. Inspect the frozen target/request and Shiprocket account through restricted operator access. Preserve the merchant reference; absence from a search is not proof that creation failed. Do not replay the mutation. Escalate for a reviewed database correction if provider evidence cannot be adopted automatically.
- `provider_failed`: a definitive HTTP rejection was recorded. A corrected create/AWB request may use an explicit new `corrected_attempt_id`; a fresh ID never authorizes replay of an ambiguous or accepted request.

Cancellation and refunds conflict with unresolved shipping intents. Shipping success cannot enter cancellation/refund finalizers. Existing cancellation reads require exact cancelled/canceled status; cancellation-requested wording and unrelated numeric status namespaces are insufficient proof.

## Tracking and webhooks

A webhook returns 200 only after its authenticated receipt and retry job commit together. A persistence failure returns a retryable error. Workers claim and fence stored receipts. A crash can replay processing safely; completed observations and scans are idempotent. Unknown orders remain unfinished and are rematched up to ten times. Inspect failed/dead retry jobs and the unfinished receipt when this limit is reached; resolve the matching problem before a deliberate requeue.

Webhooks, polling, retries, and manual refresh share the atomic observation pipeline. All supplied provider identities must match the current shipment generation. Missing/invalid times remain unknown; equal/older events do not replace current status. Stale scans remain history. Provider progress can skip milestones and traverse NDR reattempt cycles while protecting cancelled, refunded, and terminal orders. Polling uses keyset pagination and provider batches of at most 50 AWBs. Database/provider failures remain visible in sync jobs and logs.

Monitor non-200 readiness and structured `commerce_operations` logs, unfinished provider operations, failed synchronization jobs, dead retry jobs, webhook receipts, and shipment-health diagnostics. A reconciliation worker cannot fix a withdrawn lease or changed shipment generation; investigate those conflicts instead of overwriting identities.

## NDR API

Use `GET /api/admin/orders/:id/ndr` for the current AWB/episode, then `POST /api/admin/orders/:id/ndr/actions` with `action` (`re-attempt` or `return`), `comments`, a stable `request_id` UUID, and the returned `episode_id`. `reattempt_date` is optional for reattempts and must be a valid non-past India date. Customer contact/address changes and fake-attempt evidence uploads are excluded.

Reuse the same UUID for the same action. Another UUID cannot bypass the one-action-per-episode rule. A provider HTTP 202 with a validated acknowledgement means **request accepted**, not delivered or returned. Ambiguous submission requires review. Subsequent tracking closes accepted requests, including lost/damaged outcomes so a refund is not permanently blocked.

COD, customer returns, reverse pickup, and fake-attempt uploads are not enabled by this change.
