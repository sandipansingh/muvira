# Muvira business logic

This document records the durable business invariants implemented by the current application. Executable validation remains authoritative: Zod request schemas, server services, PostgreSQL constraints/functions, and regression tests take precedence if this document drifts.

## Identity and authorization

- Supabase Auth owns email/password and Google OAuth sessions.
- The Express API verifies bearer tokens with Supabase and loads the current role from `profiles`.
- Customers cannot update `profiles.role` through direct Supabase access.
- Every `/api/admin/*` request passes both authentication and server-side admin authorization.
- Direct browser writes to orders, order items, reviews, internal jobs, webhooks, tracking history, and privileged functions are revoked.
- Password recovery uses `/reset-password`, a recovery-session marker, and `supabase.auth.updateUser`.

Relevant code: `server/src/middleware/requireAuth.ts`, `server/src/middleware/requireAdmin.ts`, `client/src/context/AuthContext.tsx`, `client/src/pages/ResetPasswordPage.tsx`, and migration `026_security_boundary.sql`.

## Money and catalog

- API and database money values are non-negative integer paisa and use `_paisa` field names.
- Rupee filter inputs are converted to paisa before the product request.
- Product list, detail, and related responses use real product fields and database-derived review summaries.
- Search covers product name and description. The former “popularity” behavior is presented as Featured.
- Missing ratings, compare prices, badges, categories, promotions, or contact data are omitted rather than invented.
- Product and settings mutations invalidate their affected caches.

Relevant code: `server/src/modules/products/`, `client/src/lib/services/product.service.ts`, `client/src/lib/utils/adapters.ts`, and migration `032_product_review_summary.sql`.

## Cart, addresses, coupons, and quotes

- Authenticated cart mutations use server-owned transactional functions that validate active products, final quantity, stock, and per-item limits.
- A failed cart mutation rejects; callers must not show success or navigate.
- Guest cart merge failures remain visible and block checkout.
- At most one default address may exist per user, enforced by a partial unique index and transactional setter.
- Coupon previews and final checkout use the authenticated server cart, not a submitted subtotal.
- `POST /api/checkout/quote` accepts an optional coupon code and a supported shipping method. It returns item subtotal, discount, shipping, and total in paisa.
- Checkout totals render from the latest quote. Cart changes invalidate the quote/coupon state.
- Address failures block progress, and custom-address selection clears any saved-address identifier.

Relevant code: `server/src/modules/cart/`, `server/src/modules/addresses/`, `server/src/modules/coupons/`, `server/src/modules/checkout/`, `client/src/context/CartContext.tsx`, and migration `028_cart_address_integrity.sql`.

## Checkout and Razorpay

- Muvira supports prepaid Razorpay Checkout with provider auto-capture.
- The create-order request contains address, shipping method, optional coupon/notes, and billing choice. It contains no authoritative amount or payment-instrument fields.
- Checkout initialization snapshots contact, shipping, billing, pricing, coupon, and cart items while reserving stock and coupon capacity.
- The API returns a real Razorpay order; provider creation failure never substitutes a local fake identifier.
- Card, CVV, UPI, bank, wallet, EMI, and pay-later details are collected only by Razorpay.
- Callback verification checks HMAC, ownership, provider order/payment identifiers, amount, currency, paid/captured state, and capture flag.
- Finalization is transactional and idempotent. It commits reservations, updates payment/order state, clears the cart, and emits an outbox event once.
- Failed or expired checkout releases reservations exactly once. A failed event cannot overwrite captured payment state.
- Historical `pay_custom_%` records are quarantined for manual reconciliation.
- The success page fetches the owned order and displays success only for `payment_status = paid`.

Relevant code: `server/src/modules/checkout/`, `server/src/modules/payments/`, `client/src/components/checkout/RazorpayPayment.tsx`, `client/src/pages/OrderSuccessPage.tsx`, and migration `029_atomic_checkout.sql`.

## Orders and fulfillment

- Customer order list/detail queries enforce ownership.
- Canonical order, payment, fulfillment, and fulfillment-step constraints are named and synchronized with server/client unions.
- All non-checkout order status changes use the transactional `transition_order_status` function, which writes history with the order update.
- Shiprocket creation is a manual admin action and requires an immutable customer email plus configured pickup location.
- The supported release is prepaid and single-package.
- Shiprocket webhook URL is `/api/webhooks/shipment-status`; it fails closed unless enabled and requires `x-api-key` authentication.
- Webhook payload hashes provide idempotency. Unknown states remain diagnostic data and do not force an invalid transition.
- “RTO Delivered” maps to returned, not customer delivered.
- Remote provider success is not reported as local success until persistence succeeds; persistence failures create secured retry work.
- Customer tracking distinguishes provider failure from an empty event history.

Relevant code: `server/src/modules/orders/`, `server/src/modules/shiprocket/`, `server/src/services/retryWorker.ts`, and migration `030_fulfillment_integrity.sql`.

## Reviews and storefront claims

- Review submission requires a paid, delivered order for the product and is performed through the API.
- Review pagination requests additional backend pages; helpful voting is absent because it is not persisted.
- Empty review data shows an empty state, and API failure shows an error/retry state.
- Curated static testimonials, local-only wishlist controls, fake newsletter success, unsupported returns, free-shipping, SMS, and push claims are absent.
- Wishlist, newsletter capture, and customer return requests remain out of scope.

Relevant code: `server/src/modules/reviews/`, `client/src/components/product/ReviewsSection.tsx`, and migration `031_storefront_seed_cleanup.sql`.

## Notifications

- Email is the only supported notification channel.
- Order events enter a durable outbox and materialize at most one email delivery per event/channel.
- Customer email preferences are read and updated through authenticated API routes.
- Resend responses are checked for a provider message identifier. Failures persist attempts, bounded backoff, and terminal dead state.
- Payment confirmation follows one event path; the legacy direct mailer is removed.
- Database deduplication prevents duplicate claimed deliveries. Because Resend does not expose a provider idempotency key in the installed SDK, a process failure after provider acceptance but before local completion remains a reconciliation edge case.

Relevant code: `server/src/services/notificationDelivery.ts`, `server/src/modules/notifications/`, and migration `033_notification_delivery_integrity.sql`.

## Admin, storage, and invoices

- `/admin` provides minimum operations for orders/fulfillment, catalog, coupons, settings, invoices, and failures.
- Backend list-summary and detail DTOs are separate, and order search includes order number and customer email.
- Admin dashboard/diagnostics surface query failures instead of converting them to zero or success.
- The shared image helper validates file type/size, surfaces deletion errors, and compensates for failed catalog saves.
- Product-image insert, primary selection, deletion, and reordering use service-only transactional functions.
- Customer invoice download checks order ownership. Provider PDFs have timeout, size, MIME, and PDF-signature validation before private Storage persistence and streaming.

Relevant code: `client/src/pages/admin/`, `server/src/modules/admin/`, `client/src/lib/storage.ts`, `server/src/modules/orders/`, and migrations `034_invoice_records.sql` through `036_admin_operations_integrity.sql`.

## Operations and deployment

- Client and API deploy independently; migrations run as an explicit pre-release step.
- `/api/health` is liveness. `/api/health/ready` checks database access and the required checkout, notification, and invoice schema.
- Production startup fails on invalid mandatory Supabase, Razorpay, Shiprocket, CORS, and email configuration.
- A five-minute worker emits structured `commerce_operations` errors for failed webhooks, dead/stuck queues, unresolved reconciliation, failed invoices, expired reservations, and Shiprocket persistence retries.
- CI runs lint, formatting, types, builds, regression tests, a clean migration replay, and identity-based RLS/RPC tests.

Relevant code: `server/src/config/env.ts`, `server/src/modules/health/routes.ts`, `server/src/services/operationalAlerts.ts`, `.github/workflows/ci.yml`, and `tests/`.
