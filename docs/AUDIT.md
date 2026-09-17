• # Full-stack ecommerce audit

  Audit scope: current frontend, API, migrations, provider services, routes, request/response adapters, and environment files. I did not trust the existing untracked
  docs/AUDIT.md, which is stale and contradicted by current code. No files were modified. Static type-check passed; live Supabase, Razorpay, Shiprocket, and Resend
  operations were not executed, so external credentials/dashboard configuration remain unverified.

  ## Feature: Authentication and profile

  - Status: ⚠️ Partially working
  - Frontend: Email/password, Google OAuth, password recovery, password reset, session restoration, and profile editing all use real Supabase/Auth APIs. See client/src/
    context/AuthContext.tsx:46-161, client/src/components/auth/ForgotPasswordModal.tsx:27-51, and client/src/pages/ResetPasswordPage.tsx:21-87.

  - Backend: GET/PATCH /api/profile exists, authenticates the Supabase bearer token, and reads/writes the real profiles table. See server/src/modules/profile/
    routes.ts:7-12, server/src/middleware/requireAuth.ts:21-71, and server/src/modules/profile/service.ts:7-38.

  - Resolved connection checks:
      - API-profile restoration is required before authenticated UI state is established; failures expose retry/sign-out recovery and stale profile responses cannot
        overwrite a newer session or sign-out.
      - Sign-up distinguishes a live authenticated session from the email-confirmation flow.
      - returnTo is normalized to same-origin application paths and rejects schemes, hosts, protocol-relative paths, backslashes, and malformed encodings.

  - Remaining connection issue:
      - The auth-side promotional carousel is hardcoded Unsplash content rather than managed site content.

  - Evidence:
      - client/src/context/AuthContext.tsx:41-137 gates profile restoration with the current session attempt.
      - client/src/lib/authRedirect.ts validates post-auth paths; sign-up branches on the returned Supabase session.
      - client/src/components/auth/AuthHeroCard.tsx:11-44 contains four static marketing slides.

  - Nearby TODO/log sweep: no TODO/FIXME or commented-out auth implementation; real error logging exists at AuthContext.tsx:54,66.

  ## Feature: Addresses

  - Status: ✅ Working, based on verified static contract
  - Frontend: Saved-address list/create/edit/delete/default flows use GET/POST/PATCH/DELETE /api/addresses. See client/src/lib/services/address.service.ts:13-139.
  - Backend: Matching authenticated routes and schemas exist at server/src/modules/addresses/routes.ts:7-27 and schema.ts:7-21.
  - Connection issue: No endpoint or shape mismatch found. Default-address selection uses an atomic database RPC and ownership checks.
  - Evidence: supabase/migrations/028_atomic_cart_addresses.sql:33-67 defines set_default_address; a partial unique index prevents multiple defaults.

  ## Feature: Home storefront and featured products

  - Status: ⚠️ Partially working
  - Frontend: Hero settings, categories, arrivals, and product sections use actual API services; no mock product arrays were found. See client/src/components/home/
    HeroSlider.tsx:18-25, CategoryGrid.tsx:12-31, and NewArrivals.tsx:15-36.

  - Backend: Products and site settings are read from real Supabase tables.
  - Connection issue:
      - “Featured Pieces” is sorted by featured status but not filtered to featured products. Non-featured products fill the section when fewer than ten featured
        products exist.

      - Checkout’s recommended upsell has the same problem.
      - The upsell crosses out and displays the same current price instead of the compare-at price.

  - Evidence:
      - Client requests only sort: 'featured' at client/src/components/home/BestSellers.tsx:19-23.
      - Backend only orders by is_featured at server/src/modules/products/service.ts:103-119; it does not apply .eq('is_featured', true).
      - client/src/components/checkout/RecommendedUpsell.tsx:102-109 renders product.price in both price positions.

  - Hardcoded content: client/index.html:21-24 uses a fixed Unsplash OG image.

  ## Feature: Product listing, categories, and filters

  - Status: ✅ Working, based on verified static contract
  - Frontend: Shop pagination, category, text, sort, stock, and price filters call the product API. Rupee inputs are converted to integer paisa. See client/src/pages/
    ShopPage.tsx:72-110 and client/src/lib/services/product.service.ts:13-53.

  - Backend: GET /api/products accepts the exact query fields and filters active database products correctly. See server/src/modules/products/schema.ts:5-14 and
    service.ts:64-137.

  - Connection issue: No endpoint, request, response, or currency-unit mismatch found.
  - Evidence: min_price_paisa/max_price_paisa are sent by the client and consumed by the backend; pagination metadata matches server/src/modules/products/
    controller.ts:6-19.

  - Minor issue: Filter price bands are hardcoded in client/src/components/catalog/CatalogSidebar.tsx:12-18.
  - Mock/stub check: no mock products or dummy backend results found.

  ## Feature: Search

  - Status: ✅ Working, based on verified static contract
  - Frontend: Header and search page send q, category, pagination, sort, price, and stock parameters. See client/src/components/layout/Header.tsx:30-38 and client/src/
    pages/SearchPage.tsx:80-118.

  - Backend: The product service normalizes the query and searches both name and description with ilike. See server/src/modules/products/service.ts:23-29,94-101.
  - Connection issue: None found.
  - Evidence: The frontend and backend both use the parameter name q; no mock search results exist.

  ## Feature: Product detail and related products

  - Status: ⚠️ Partially working
  - Frontend: Calls real GET /api/products/:slug and GET /api/products/:id/related endpoints. See client/src/lib/services/product.service.ts:59-95.
  - Backend: Both routes exist and query active products, images, categories, review summaries, and same-category related products. See server/src/modules/products/
    routes.ts:24-35 and service.ts:217-260.

  - Connection issue: Review loading has a stale-request race. During rapid slug navigation, a late review response for the previous product can overwrite the current
    product’s reviews.

  - Evidence: client/src/pages/ProductDetailPage.tsx:48-68 mutates review state without an abort/active guard, although the surrounding product effect at :76-112 does
    guard the product request.

  - Data note: The frontend property salePrice actually maps compare_at_price_paisa; rendering is correct in normal product cards but the naming is misleading.

  ## Feature: Cart

  - Status: ⚠️ Partially working
  - Frontend: Authenticated carts use the API; guest carts use localStorage and merge after login. See client/src/context/CartContext.tsx:49-59,98-152 and client/src/
    lib/services/cart.service.ts:13-107.

  - Backend: Matching routes use checked database functions for stock-safe add/update and ownership-checked removal. See server/src/modules/cart/routes.ts:7-23 and
    service.ts:38-146.

  - Connection issue: When site-settings loading fails, guest cart totals use invented fallback shipping values of ₹150 and a ₹1,000 free-shipping threshold.
  - Evidence:
      - Defaults: client/src/context/SiteSettingsContext.tsx:12-28.
      - Failure leaves defaults active: SiteSettingsContext.tsx:38-50.
      - Cart calculates totals from them: client/src/context/CartContext.tsx:383-394.

  - Impact: Signed-in checkout eventually uses a server quote, but guest users may see incorrect commercial totals.
  - Mock/stub check: no mock cart products or fake backend cart rows found.

  ## Feature: Checkout and shipping

  - Status: ⚠️ Partially working
  - Frontend: Loads addresses, obtains an authoritative quote, blocks empty/unmerged carts, and passes address, coupon, billing, and shipping method into payment. See
    client/src/pages/CheckoutPage.tsx:93-149,173-238,450-461.

  - Backend: Matching authenticated and validated quote/create/cancel routes exist. The server re-reads products, stock, coupon, and settings rather than trusting client
    totals. See server/src/modules/checkout/routes.ts:8-29 and service.ts:82-168.

  - Connection issues:
      - The admin UI writes shipping_rules, but checkout reads shipping_methods. Changing admin-visible shipping prices does not affect checkout.
      - The API returns an enabled flag for shipping methods, but the UI keeps disabled methods clickable; selecting one causes a quote error.
      - Checkout offers USA/UK/UAE country codes, but always sends country: 'India' and truncates the number to ten digits.
      - The required editable checkout email is neither persisted nor passed to Razorpay; the account email is used instead.
      - The quote’s tax_amount_paisa is mapped but ignored; the page hardcodes “₹0.00 (Included).”

  - Evidence:
      - Checkout reads .eq('key', 'shipping_methods') at server/src/modules/checkout/service.ts:159-163.
      - Admin writes shipping_rules at client/src/pages/admin/AdminSettingsPage.tsx:41-63,161-186.
      - The migration’s admin setting allowlist includes shipping_rules, not shipping_methods: supabase/migrations/036_admin_operations_integrity.sql:35-45.
      - Disabled option rendering lacks a disabled control at client/src/components/checkout/ShippingSection.tsx:303-375.
      - Address creation omits email and forces India at client/src/pages/CheckoutPage.tsx:206-218.

  - Database behavior: initialize_checkout atomically recalculates totals, reserves stock/coupon use, snapshots prices/addresses, and creates order items in supabase/
    migrations/029_atomic_checkout.sql:175-478.

  ## Feature: Coupons

  - Status: ⚠️ Partially working
  - Frontend: Customer coupon application uses a real authenticated checkout quote. Admin can list, create, edit supported fields, deactivate, and reactivate coupons. See client/src/context/
    CartContext.tsx:310-338 and client/src/pages/admin/AdminCouponsPage.tsx:22-74,149-224.

  - Backend: Coupon validation checks dates, activity, usage, minimum order, fixed/percentage arithmetic, and caps. Checkout atomically reserves and commits usage. See
    server/src/modules/coupons/service.ts:7-62 and supabase/migrations/029_atomic_checkout.sql:281-318,609-618.

  - Remaining limitation: The edit UI covers discount value and minimum order amount; code, description, type, cap, dates, and usage limits are not yet editable.

  - Resolved invariant: PATCH validation merges stored and incoming coupon fields before cross-field checks, and migration 041 enforces percentage values at or below 100
    in the database after an explicit invalid-row preflight.

  ## Feature: Razorpay payment and webhook

  - Status: ✅ Recovery paths verified locally; live Razorpay staging remains unverified
  - Frontend: Uses the real Razorpay Checkout SDK and sends only provider IDs/signature to the API; it does not collect card, CVV, UPI, or bank credentials. See client/
    index.html:28-29 and client/src/components/checkout/RazorpayPayment.tsx:82-145.

  - Backend: Real provider order creation, HMAC verification, provider payment/order refetch, ownership, ID, amount, currency, captured state, and paid-state checks
    exist. Raw webhook body handling is correctly mounted before JSON parsing. See server/src/modules/payments/service.ts:105-299 and server/src/app.ts:92-109.

  - Resolved recovery behavior:
      - Captured finalization failures and captured-state mismatches create an idempotent reconciliation case. Exhausted case-write retries emit a distinct structured
        fatal alert with the local/provider identifiers and return a persistence-specific error.
      - Provider order IDs are captured before response validation; attach/validation failures create an orphan reconciliation case before reservation release, and an
        exhausted case-write failure retains reservations while emitting the full provider metadata for manual recovery.
      - Failed webhook processing is stored, retry enqueue is retried with backoff, and enqueue exhaustion remains visible as a failed event plus a fatal alert/503.
      - Razorpay webhook events use atomic token leases with stale-lease recovery and heartbeats, preventing redelivery and worker retry from processing one event
        concurrently.
      - payment.failed re-fetches provider state and never releases reservations for Razorpay's retryable created/attempted states or captured/in-progress funds. The
        existing client cancellation endpoint remains the immediate-release path; otherwise database checkout expiry releases the reservation.
      - Failure UI offers another checkout only after the server reports released reservations.

  - Evidence:
      - Reconciliation retry/escalation: server/src/modules/payments/service.ts:49-101,144-184,230-264.
      - Early orphan capture: server/src/modules/checkout/service.ts:218-310.
      - Webhook leases/retry/failure guards: server/src/modules/payments/service.ts:289-649 and supabase/migrations/042_payment_recovery_rework.sql.
      - Behavioral failure/race coverage: tests/payment-recovery-behavior.test.cjs.

  - Verification: Local migration replay, pgTAP lease/security tests, full API integration tests, and injected captured-payment/webhook race tests pass. External Razorpay
    credential behavior remains a staging smoke-test concern.

  ## Feature: Orders, order history, and cancellation/refunds

  - Status: ❌ Broken for cancellation/refund semantics; history/detail are connected
  - Frontend: Order history, detail, verified success confirmation, tracking, and invoice buttons use real authenticated APIs. See client/src/pages/
    OrdersHistoryPage.tsx:35-62, OrderDetailPage.tsx:22-68, and OrderSuccessPage.tsx:18-48.

  - Backend: List/detail queries enforce user_id ownership. See server/src/modules/orders/routes.ts:17-29 and service.ts:36-93.
  - Connection issues:
      - Customer paid-order cancellation is not implemented.
      - Admin UI offers cancelled and refunded, but the backend operation only mutates local order status.
      - It does not change payment_status, update the payment record, issue a Razorpay refund, or cancel Shiprocket.
      - admin_manual bypasses normal transition validation.

  - Evidence:
      - All statuses are selectable at client/src/pages/admin/AdminOrderDetailPage.tsx:11-25,152-174.
      - adminUpdateOrderStatus only calls transition_order_status at server/src/modules/orders/service.ts:172-206.
      - supabase/migrations/033_notification_delivery_integrity.sql:78-106 allows admin_manual and updates order/fulfillment state only.

  - Impact: P0. The system can claim an order is refunded while the customer has not received a refund.

  ## Feature: Shiprocket fulfillment and tracking

  - Status: ⚠️ Raw webhook persistence fixed; polling/manual/configuration gaps remain
  - Frontend: Customer order detail uses the owned DB-backed tracking endpoint. Admin exposes create shipment, assign AWB, schedule pickup, and invoice. See client/src/
    pages/OrderDetailPage.tsx:44-61,147-213 and client/src/pages/admin/AdminOrderDetailPage.tsx:178-235.

  - Backend: Real Shiprocket authentication, API calls, timeout handling, token refresh, circuit breaker, webhook verification, replay auditing, retry records, and
    polling exist.

  - Connection issues:
      - All workspace server environment variants omit both webhook settings, so the webhook is disabled and returns 401 unless deployment injects them.
      - Full /fulfill, label, manifest, retry, cancellation, and refresh capabilities are not exposed by the active admin UI.
      - default_weight_grams can be saved in admin but shipment payload creation uses hardcoded 200g/500g fallbacks.
      - The generic public tracking controller and unused client service turn database/network failures into empty successful results.
      - Shiprocket rate limiting busy-waits synchronously, blocking the Node event loop.
      - Polling schedules can overlap and OFD shipments are included in both the 15-minute general poll and five-minute OFD poll.

  - Evidence:
      - Migration 040 replaces the legacy three-value constraint with a bounded raw-status contract and runtime-readiness check.
      - Raw provider state is stored separately from normalized order transitions; Delivered, Undelivered, Not Delivered, and RTO Delivered have explicit tested semantics.
      - Webhook enablement defaults to false at server/src/config/env.ts:45-53; verifier rejects disabled calls at server/src/modules/shiprocket/webhookSecurity.ts:14-
        24.

      - Busy loop: server/src/services/shiprocket.ts:29-48.
      - Suppressed tracking errors: server/src/modules/tracking/controller.ts:52-66,89-128 and client/src/lib/services/tracking.service.ts:23-57.

  - Positive evidence: provider success followed by local Shiprocket persistence failure does enqueue shiprocket_persist work at server/src/modules/orders/
    service.ts:616-650,1145-1192.

  - Impact: The schema blocker is resolved; deployment configuration and the remaining polling/tracking/admin gaps still prevent treating fulfillment as fully complete.

  ## Feature: Invoices

  - Status: ⚠️ Partially working / provider-dependent
  - Frontend: Customer and admin download real PDF blobs and expose failures. See client/src/pages/OrderDetailPage.tsx:87-104,126-145 and client/src/lib/api/
    client.ts:147-190.

  - Backend: Customer/admin routes validate ownership or admin access, require paid/Shiprocket-created orders, generate via Shiprocket, validate MIME/PDF signature/size,
    store privately, and persist ready/failed state. See server/src/modules/orders/service.ts:914-1069.

  - Connection issue: An invoice_generate retry handler exists, but invoice-generation failure only marks the database record failed; it never enqueues that retry job.
  - Evidence: Retry handler at server/src/services/retryWorker.ts:100-107; failure path at server/src/modules/orders/service.ts:1048-1055.
  - Schema: invoice_records and the private invoice bucket are created in supabase/migrations/034_invoice_records.sql:3-87.
  - Mock/stub check: no fake PDF or dummy invoice response found.

  ## Feature: Reviews

  - Status: ⚠️ Partially working
  - Frontend: Product-detail listing and submission use real APIs. See client/src/lib/services/review.service.ts:34-100 and client/src/components/product/
    ReviewsSection.tsx:63-228.

  - Backend: Public list and authenticated upsert routes match. Submission requires a paid, delivered order containing the product. See server/src/modules/reviews/
    routes.ts:13-42 and service.ts:8-33,117-153.

  - Connection issues:
      - Review requests can race during rapid product navigation.
      - Admin list/delete endpoints exist but there is no admin review page, route, or service UI.
      - getUserReviewForProduct exists but is not routed; the UI cannot explicitly load/edit the customer’s current review.
      - Admin query documentation says q searches comment or product name, but implementation searches comments only.
      - Public review responses expose user_id unnecessarily.

  - Evidence:
      - No admin review route exists in client/src/App.tsx:87-96.
      - Backend admin routes exist at server/src/modules/reviews/routes.ts:31-42.
      - Search is only dbQuery.ilike('comment', ...) at server/src/modules/reviews/service.ts:188-190.

  - Mock/stub check: no fake reviews or dummy aggregate data found.

  ## Feature: Notifications and Resend email

  - Status: ⚠️ Partially working
  - Frontend: Profile preferences call real GET/PUT /api/notifications/preferences. See client/src/lib/services/notification.service.ts:15-49 and client/src/pages/
    ProfilePage.tsx:97-121,210-225.

  - Backend: Preferences are persisted in notification_preferences; a durable outbox/delivery worker sends through Resend to the immutable order contact email. Atomic
    claims and stale-claim recovery use FOR UPDATE SKIP LOCKED. See server/src/services/notificationDelivery.ts:65-70,154-236 and supabase/
    migrations/033_notification_delivery_integrity.sql:264-303.

  - Connection issues:
      - If preference loading fails, the checkbox remains disabled and no retry UI is offered.
      - Opted-out deliveries are marked skipped, but worker summary calculates failed = processed - sent, so skips are incorrectly reported as failures.
      - Admin notification failures are fetched only from the first page and then filtered client-side, hiding later failures.
      - Only email order updates exist; there is no inbox, SMS, or push implementation.

  - Evidence:
      - Disabled preference UI: client/src/pages/ProfilePage.tsx:350-374.
      - Metric calculation: server/src/services/notificationDelivery.ts:211-215,257-265.
      - First-page/client-side filtering: client/src/pages/admin/AdminFailuresPage.tsx:24-37.

  - Provider state: RESEND_API_KEY is required in production and present in local env files, but key/domain validity was not verified.

  ## Feature: Admin panel

  - Status: ⚠️ Partially working
  - Frontend: Six real pages exist—Overview, Orders, Catalog, Coupons, Settings, and Failures. See client/src/App.tsx:87-96 and client/src/components/admin/
    AdminShell.tsx:5-12.

  - Backend: A broader admin router is protected by both requireAuth and requireAdmin, covering products, categories, coupons, orders, dashboard, inventory, settings,
    cache, reviews, Shiprocket, notifications, and diagnostics. See server/src/app.ts:142-159.

  - Connection issues:
      - No UI for review moderation, complete inventory/low-stock management, cache operations, pickup/serviceability discovery, labels/manifests, provider cancellation,
        tracking refresh, or most diagnostics/circuit-breaker state.

      - Catalog UI only supports create and stock/visibility/featured toggles despite full backend CRUD, image reorder/delete, and category update/delete.
      - Coupon UI cannot edit/reactivate existing coupons.
      - Settings schema supports hero slides, promo banners, and store description, but UI cannot edit them.
      - Admin catalog displays salePrice ?? price; because salePrice means compare-at/original price, discounted products show the wrong primary price.
      - Order notes use a non-transactional read-modify-write and can lose simultaneous edits.

  - Evidence:
      - Backend-only inventory routes: server/src/modules/admin/inventory/routes.ts:9-19.
      - Backend-only diagnostics routes: server/src/modules/admin/diagnostics/routes.ts:6-21.
      - Catalog limitations: client/src/pages/admin/AdminCatalogPage.tsx:55-95,239-315.
      - Settings schema/UI mismatch: server/src/modules/settings/schema.ts:44-53 versus client/src/pages/admin/AdminSettingsPage.tsx:34-63.
      - Note read-modify-write: server/src/modules/orders/service.ts:233-258.

  ### Admin failure/retry reliability

  - Status: ⚠️ Backend concurrency fixed; frontend pagination remains incomplete
  - Backend: Retry jobs are atomically claimed with SKIP LOCKED leases, stale leases are reclaimable, active work renews its lease, and workers claim one job at a time so
    queued jobs do not expire before execution. Manual requeue resets retry/error/lease/schedule metadata.

  - Frontend issue: Failures UI always requests page 1 and applies some status filtering afterward in the browser.
  - Evidence:
      - Runtime worker and heartbeat: server/src/services/retryWorker.ts:210-335.
      - Atomic claims, renewal, stale recovery, and token-gated settlement: supabase/migrations/039_payment_recovery.sql and 042_payment_recovery_rework.sql.

  ## Feature: Supabase Storage and product/category images

  - Status: ⚠️ Partially working
  - Frontend: Upload validates JPEG/PNG/WebP/AVIF and 8MB, uploads to images, and cleans up newly uploaded files if entity creation/attachment fails. See client/src/lib/
    storage.ts:4-69 and client/src/pages/admin/AdminCatalogPage.tsx:55-123.

  - Backend/schema: Storage policies enforce matching MIME/size restrictions and admin-only managed folders. See supabase/migrations/035_storage_hardening.sql:3-39.
  - Connection issue: Product-image deletion removes only the product_images database row; it never deletes the Storage object.
  - Evidence:
      - Backend invokes only delete_product_image_atomic at server/src/modules/products/service.ts:328-337.
      - SQL only deletes/reorders DB rows at supabase/migrations/036_admin_operations_integrity.sql:89-119.

  - Impact: The live DELETE API can accumulate orphaned public objects, although the current admin UI has no delete control.

  ## Feature: Wishlist and other optional customer features

  - Status: 🚧 Not implemented
  - Frontend: No wishlist/favorite UI, route, service, or persistence exists.
  - Backend: No wishlist route, table, or migration exists.
  - Connection issue: None—the feature is absent on both sides rather than falsely wired.
  - Evidence: Customer route map at client/src/App.tsx:99-114 contains no wishlist route; repository-wide search found no wishlist/favorite implementation.
  - SMS, push notifications, and customer returns are also absent. Their controls and claims are not exposed, consistent with the repository’s stated product scope.

  ## Feature: Database schema, RLS, and runtime readiness

  - Status: ⚠️ Strong checked-in security; deployed state unverified
  - Frontend/backend consistency: All tables and RPCs referenced by current product, cart, address, checkout, payment, order, review, notification, invoice, and settings
    services exist in migrations.

  - Security:
      - Direct profile/review/order mutations were revoked.
      - Anonymous/authenticated table and sequence privileges are broadly revoked; the API service role is used for commerce.
      - is_admin is restricted to the current authenticated user.
      - All non-health API routes are gated by runtime schema readiness.

  - Evidence:
      - supabase/migrations/026_security_boundary.sql:3-27.
      - supabase/migrations/037_runtime_privileges.sql:3-65.
      - supabase/migrations/038_runtime_schema_contract.sql:40-380.
      - Gate: server/src/app.ts:119-127.

  - Resolved schema check: Runtime contract 42 requires the bounded Shiprocket raw-status constraint plus Razorpay webhook/retry lease columns, functions, and indexes.

  - Test limitation: Local migration replay and database security/readiness tests pass; deployed migration state still requires deployment-side verification.

  ## Feature: Environment and API configuration

  - Status: ❌ Shiprocket webhook configuration incomplete; remaining runtime variables documented

   Scope                   Referenced variables                                 Example coverage                      Actual workspace env coverage
  ━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Client application      VITE_API_URL, VITE_SUPABASE_URL,                     All present in client/.env.example    Present in .env, .env.development, .env.production
                           VITE_SUPABASE_ANON_KEY, VITE_STORE_NAME,
                           VITE_AUTH_REDIRECT_URL
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Client static server    PORT                                                 Missing; defaults to 3000             Missing; default applies
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Server core             NODE_ENV, PORT, LOG_LEVEL, ALLOWED_ORIGINS,          All present                           Present
                           ORDER_PREFIX, STORE_NAME, CACHE_ENABLED,
                           CACHE_DEBUG
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Supabase server         SUPABASE_URL, SUPABASE_ANON_KEY,                     All present                           Present
                           SUPABASE_SERVICE_ROLE_KEY
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Razorpay                RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,                All present                           Present
                           RAZORPAY_WEBHOOK_SECRET
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Email                   RESEND_API_KEY, EMAIL_FROM                           Both present                          Present
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Shiprocket              SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD,               All present                           Email/password present; both webhook variables
                           SHIPROCKET_WEBHOOK_ENABLED,                                                                missing from all three server env files
                           SHIPROCKET_WEBHOOK_SECRET
  ──────────────────────  ───────────────────────────────────────────────────  ────────────────────────────────────  ────────────────────────────────────────────────────
   Test/CI only            SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY,           Missing from env examples             Supplied by CI/workflow when relevant; not present
                           SUPABASE_TEST_SERVICE_ROLE_KEY,                                                            in local env files
                           EXPECTED_SCHEMA_READY,
                           RUN_STAGING_PROVIDER_SMOKE, STAGING_API_URL

  Additional findings:

  - Development’s empty VITE_API_URL is intentional: Vite proxies /api to port 4000 at client/vite.config.ts:7-17.
  - Production client/server origins and Supabase project URLs are consistent in the checked local configurations.
  - VITE_RAZORPAY_KEY_ID appears in all client env files but is unused and absent from the example. Checkout correctly uses the key ID returned by the server.
  - Actual env files are git-ignored; no secret values were reproduced.
  - Runtime server validation is centralized at server/src/config/env.ts:8-63.
  - Test-only variables are mentioned partly in README/CI but lack a complete example file, making local integration/staging setup less discoverable.

  ## TODO, mock, placeholder, and logging sweep

  - No active TODO, FIXME, "not implemented", empty handler, or dummy provider response was found in current client/src or server/src.
  - No mock catalog, cart, coupon, review, checkout, order, invoice, or tracking data is returned by the backend.
  - Hardcoded/non-authoritative data that should be called out:
      - Client site-setting shipping fallbacks.
      - Auth marketing slides and OG image.
      - Catalog filter price bands.
      - Shiprocket 200g/500g fallback weights.
      - Hardcoded checkout tax display.

  - Logging exceptions:
      - Startup environment validation uses console.error intentionally before Pino initialization.
      - Cache debug uses console.log at server/src/config/cache.ts:16 rather than structured Pino.
      - Auth initialization/profile failures use console.error at client/src/context/AuthContext.tsx:54,66.

  - No nearby commented-out feature implementations were found.

  ## Summary Table

   Feature                               Frontend                     Backend                                Connected?                              Priority to fix
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━
   Authentication/profile                Real Supabase flows          Real profile/auth middleware           Mostly                                  P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Addresses                             Full CRUD/default UI         Real API + atomic RPC                  Yes                                     P3
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Home/featured                         Real API data                Real product/settings data             Partial: featured is sort-only          P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Product listing/categories/filters    Implemented                  Implemented                            Yes                                     P3
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Search                                Implemented                  Implemented                            Yes                                     P3
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Product detail                        Implemented                  Implemented                            Partial: review race                    P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Cart                                  API + guest localStorage     Stock-safe DB RPCs                     Partial: fake fallback totals           P1
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Checkout/shipping                     Implemented                  Atomic quote/order init                Partial: settings/contact/method        P1
                                                                                                             disconnects
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Coupons                               Apply/create/edit/toggle     Validation + DB percentage invariant   Partial: edit surface                    P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Razorpay payment                      Real hosted flow             Leased webhook + reconciliation         Verified locally; staging pending       P1
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Orders/refunds                        History/detail work          Owned queries work                     Refund/cancel semantics broken          P0
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Shiprocket/tracking                   Customer/admin partial UI    Raw webhook status persistence          Partial: config/polling/admin gaps       P1
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Invoices                              Real PDF download            Provider generation/private storage    Partial: retry not enqueued             P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Reviews                               Storefront implemented       Public/admin APIs exist                Admin disconnected; request race        P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Notifications                         Preference UI                Durable Resend worker                  Partial observability/UI                P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Admin panel                           Six real pages               Much broader admin API                 Many operations disconnected            P1
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Retry queue                           First-page failures UI       Atomic leased claims + heartbeat        Backend safe; UI pagination remains     P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Supabase Storage                      Upload connected             Policies connected                     Delete leaks objects                    P2
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Wishlist                              Absent                       Absent                                 Not implemented                         P3/product decision
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Schema/RLS                            N/A                          Runtime contract 42 verified locally    Deployment state unverified             P1
  ────────────────────────────────────  ───────────────────────────  ─────────────────────────────────────  ──────────────────────────────────────  ─────────────────────
   Environment                           Client mostly complete       Server mostly complete                 Shiprocket webhook vars absent          P0

  ## Suspected root causes / patterns

  - Provider integrations were built more deeply in the backend than in the active admin UI. This left review moderation, fulfillment orchestration, labels/manifests,
    cancellation, inventory, and diagnostics disconnected.

  - Operational tables and dashboards were added before all producer paths; payment reconciliation producers are now connected, while other dashboard completeness
    findings remain separately listed above.
  - Admin order status is treated as a display mutation instead of a financial/fulfillment operation. This allows “refunded” and “cancelled” states to diverge from
    Razorpay and Shiprocket.

  - Configuration names drifted: admin writes shipping_rules, while checkout reads shipping_methods; admin stores a default weight that shipment construction ignores.
  - Some older public helpers collapse errors into empty success states, especially tracking.
  - Retry-queue claiming now matches the leased recovery pattern; producer coverage and dashboard pagination remain inconsistent in the areas listed above.
  - Customer-facing forms expose fields or choices that downstream code ignores: shipping email, international country code, disabled shipping options, and tax amount.
  - Most of the project is not mock-driven. The dominant problem is semantic disconnection between otherwise real frontend, backend, provider, and database components.
