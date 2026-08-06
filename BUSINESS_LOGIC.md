# BUSINESS_LOGIC.md

> **Purpose**: Read-only extraction of every piece of non-visual business logic from the Muvira
> e-commerce platform (`kolkata-client`). This document is the authoritative specification to
> survive a full UI/JSX rewrite (Phase 2).
>
> **Stack**: React + TypeScript (Vite) client · Express + TypeScript server · Supabase
> (PostgreSQL + Auth + Storage) · Razorpay (payments) · Shiprocket (fulfillment)
>
> **Currency convention**: All monetary values are stored and passed as **integer paisa**
> (₹1 = 100 paisa). Conversion to Rupees (`paisa / 100`) happens only at the display layer.

---

## Table of Contents

1. [Auth & Permissions](#1-auth--permissions)
2. [Cart](#2-cart)
3. [Checkout & Payments](#3-checkout--payments)
4. [Orders & Fulfillment](#4-orders--fulfillment)
5. [Products & Catalog](#5-products--catalog)
6. [Categories](#6-categories)
7. [Coupons](#7-coupons)
8. [Reviews](#8-reviews)
9. [Addresses](#9-addresses)
10. [Shiprocket / Shipping Integration](#10-shiprocket--shipping-integration)
11. [Admin Dashboard & Inventory](#11-admin-dashboard--inventory)
12. [Site Settings](#12-site-settings)
13. [Infrastructure Services](#13-infrastructure-services)
14. [Types & Interfaces (Domain Models)](#14-types--interfaces-domain-models)
15. [Utility Functions & Constants](#15-utility-functions--constants)
16. [Custom Hooks](#16-custom-hooks)
17. [Side Effects Catalogue](#17-side-effects-catalogue)
18. [Extraction Plan](#18-extraction-plan)

---

## 1. Auth & Permissions

### [Auth] Supabase Session Management
- **Current location**: `client/src/context/AuthContext.tsx`
- **Purpose**: Central source of truth for user authentication state throughout the React app.
- **Inputs**: None (reads from Supabase `auth.getSession()` on mount)
- **Outputs/Returns**: `user: Profile | null`, `token: string | null`, `loading: boolean`, `isAuthenticated: boolean`, `isAdmin: boolean`
- **Logic**:
  1. On mount: call `supabase.auth.getSession()` to restore any persisted session from `localStorage`.
  2. If session found, fetch full profile from `GET /api/profile` (authenticated) and store in state.
  3. Subscribe to `supabase.auth.onAuthStateChange` — on any auth event (login, logout, token refresh), re-fetch profile and update state.
  4. Uses a `mounted` boolean guard to prevent state updates on unmounted components.
  5. `isAdmin` is derived as `user?.role === 'admin'` — role-based, not claim-based.
- **Dependencies**: `supabase.ts`, `/api/profile` endpoint, `adapters.ts#mapProfile`
- **Edge cases handled**: SSR redirect URL fallback; profile fetch failure returns null; `mounted` guard prevents memory leaks on unmount.

### [Auth] Login
- **Current location**: `client/src/context/AuthContext.tsx` → `login()`
- **Inputs**: `email: string`, `password: string`
- **Outputs/Returns**: `Promise<boolean>` — true on success, false on failure
- **Logic**:
  1. Call `supabase.auth.signInWithPassword({ email, password })`.
  2. If error or no session → show error toast, return `false`.
  3. On success: fetch profile from `/api/profile`, set user/token state, show welcome toast.

### [Auth] Signup
- **Current location**: `client/src/context/AuthContext.tsx` → `signup()`
- **Inputs**: `email: string`, `password: string`, `fullName: string`, `phone: string`
- **Logic**:
  1. Call `supabase.auth.signUp()` with `options.data = { full_name, phone }` and `emailRedirectTo = getEmailRedirectUrl()`.
  2. **Email confirmation path**: If `data.session === null`, email confirmation is required. Show "check email" toast, return `true` without setting user state.
  3. **Direct session path**: Call `PATCH /api/profile` with `{ full_name, phone }` to populate the profile row (DB trigger creates blank row; this fills it in). Non-fatal if PATCH fails.
  4. Race condition guard: if profile fetch returns null, construct a `displayProfile` from input values and use temporarily.
- **Edge cases**: Email confirmation required; profile row creation race condition; non-fatal profile PATCH failure.

### [Auth] Email Redirect URL Resolution
- **Current location**: `client/src/context/AuthContext.tsx` → `getEmailRedirectUrl()`
- **Logic** (priority order):
  1. Return `VITE_AUTH_REDIRECT_URL` env var if set.
  2. If `localhost` or `127.0.0.1` in `window.location.origin` → return `origin + '/'`.
  3. Production: return current `origin + '/'` (handles both `muvira.in` and `www.muvira.in`).
  4. SSR fallback: `'https://muvira.in/'`.

### [Auth] Logout
- **Current location**: `client/src/context/AuthContext.tsx` → `logout()`
- **Logic**: Call `supabase.auth.signOut()`, clear `user` and `token` state, show success toast.

### [Auth] Profile Update
- **Current location**: `client/src/context/AuthContext.tsx` → `updateProfile()`
- **Inputs**: `fullName: string`, `phone: string`
- **Logic**: `PATCH /api/profile` with `{ full_name, phone }`. On success, update `user` state via `mapProfile()`. On failure, show error toast, return `false`.

### [Auth] Route Guard — RequireAuth (Client)
- **Current location**: `client/src/components/auth/AuthGuard.tsx`
- **Rule**: While `loading` → render full-page spinner. If `!isAuthenticated` → redirect to `/login` with `state: { from: location }` (preserves destination for post-login redirect).
- **Protected routes**: `/checkout`, `/orders/success`, `/orders/failure`, `/orders`, `/orders/:id`, `/profile`.

### [Auth] Route Guard — RequireAdmin (Client)
- **Current location**: `client/src/components/auth/AuthGuard.tsx`
- **Rule**: Same as RequireAuth PLUS checks `isAdmin`. If authenticated but not admin → redirect to `/` with 403 block rendered. Admin check is `user.role === 'admin'`.
- **Protected routes**: All `/admin/*` routes.

### [Auth] HTTP Client — Token Auto-Refresh
- **Current location**: `client/src/lib/api/client.ts`
- **Logic**: On `401` response from backend:
  1. Call `supabase.auth.refreshSession({ refresh_token: current.refresh_token })`.
  2. Retry original request with new access token once.
  3. If refresh fails or no refresh token, 401 propagates to caller.

### [Auth] Server Middleware — `requireAuth`
- **Current location**: `server/src/middleware/requireAuth.ts`
- **Logic**:
  1. Extract JWT from `Authorization: Bearer <token>`. Return 401 if missing/malformed.
  2. Verify JWT via `adminSupabase.auth.getUser(token)` (validates signature, expiry, audience).
  3. Fetch `role` from `profiles` table by `user.id`. **Role comes from DB, NOT from JWT claims.**
  4. Attach `req.user = { id, email, role }`, `req.token`, `req.supabase` (user-scoped client).
- **Edge cases**: Profile not found after valid JWT → 401 (prevents orphaned auth tokens).

### [Auth] Server Middleware — `requireAdmin`
- **Current location**: `server/src/middleware/requireAdmin.ts`
- **Rule**: Must run AFTER `requireAuth`. Checks `req.user.role !== 'admin'` → 403 Forbidden. Logs warning with `userId` and `role` for audit trail.

---

## 2. Cart

### [Cart] Cart State Management (Client)
- **Current location**: `client/src/context/CartContext.tsx`
- **Purpose**: Client-side cart state that mirrors the server cart (server is source of truth).
- **State held**: `cart: Cart`, `coupon: CouponPreview | null`, `loading: boolean`
- **Derived values**:
  - `discountAmount = coupon?.discountAmount ?? 0`
  - `discountedSubtotal = cart.subtotal - discountAmount`
  - `shippingAmount`: see Shipping Amount Calculation below
  - `totalAmount = discountedSubtotal + shippingAmount`
- **On `isAuthenticated` change**: if logged in → fetch cart from server; if logged out → reset to `EMPTY_CART = { items: [], subtotal: 0, itemCount: 0 }` and clear coupon.

### [Cart] Shipping Amount Calculation (Client)
- **Current location**: `client/src/context/CartContext.tsx`
- **Logic**:
  ```
  if (cart.items.length > 0 && settings?.shippingRules) {
    const { shippingChargePaisa, freeShippingThresholdPaisa } = settings.shippingRules
    if (freeShippingThresholdPaisa > 0 && discountedSubtotal >= freeShippingThresholdPaisa) {
      shippingAmount = 0   // free shipping threshold met
    } else {
      shippingAmount = shippingChargePaisa   // flat rate
    }
  }
  ```
  Threshold applies to the **post-discount** subtotal.
- **Dependencies**: `useSiteSettings()` for live shipping rules config.

### [Cart] Add to Cart
- **Current location**: `client/src/context/CartContext.tsx` → `addToCart(productId, quantity)`
- **Logic**: `POST /api/cart/items`. On success, re-fetch full cart for updated subtotals. Shows product name in success toast.
- **Server rules** (`server/src/modules/cart/service.ts`):
  - Product must exist and `is_active = true`.
  - `product.stock >= input.quantity`.
  - If item already in cart → increment quantity. Max 100 units per cart item (`CART_LIMIT`).
  - `user_id` always from JWT — never from client input body.

### [Cart] Update Quantity
- **Current location**: `client/src/context/CartContext.tsx` → `updateQuantity(itemId, quantity)`
- **Logic**: `PATCH /api/cart/items/:itemId`. On success:
  1. Update cart state with response.
  2. **Re-validate applied coupon** against new subtotal: `couponsApiService.applyCoupon(coupon.code, newSubtotal)`.
  3. If re-validation fails (subtotal may have dropped below minimum) → remove coupon, show info toast: `"Coupon removed - cart total fell below minimum."`.
- **Server rules**: Layer 2 ownership check (`cart_item.user_id === req.user.id`). Stock re-validated.

### [Cart] Remove from Cart
- **Current location**: `client/src/context/CartContext.tsx` → `removeFromCart(itemId)`
- **Logic**: `DELETE /api/cart/items/:itemId`. On success: re-fetch cart, re-validate coupon (same logic as update quantity).

### [Cart] Clear Cart State (Client Only)
- **Current location**: `client/src/context/CartContext.tsx` → `clearCartState()`
- **Logic**: Resets `cart = EMPTY_CART` and `coupon = null` in local state only. Called after successful checkout.

---

## 3. Checkout & Payments

### [Checkout] Address Selection at Checkout
- **Current location**: `client/src/routes/store/CheckoutPage.tsx`
- **Logic on mount**: Fetch `GET /api/addresses`. Auto-select: prefer `isDefault = true` address; else fall back to first in list.
- **Add address form validation** (client-side):
  - Required: `fullName`, `phone`, `line1`, `city`, `state`, `pincode`
  - `phone`: strip non-digits, max 10 chars
  - `pincode`: strip non-digits, max 6 chars
  - `country`: hardcoded to `'India'`
  - Label options: `'home'` | `'office'` | `'other'` (default: `'home'`)

### [Checkout] Payment Flow — Razorpay Integration
- **Current location**: `client/src/routes/store/CheckoutPage.tsx` → `handlePayNow()`
- **Logic**:
  1. Guard: `selectedAddressId` must be set.
  2. `POST /api/checkout/create-order` with `{ address_id, coupon_code, notes }`.
  3. On error `OUT_OF_STOCK` → navigate to `/cart`. Other errors → toast error.
  4. Initialize `window.Razorpay` (SDK loaded via `<script>` in `index.html`).
  5. Prefill `name/email/contact` from authenticated user data or selected address.
  6. **On payment success** (`handler`): `POST /api/payments/verify` with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
     - Verify success → `clearCartState()`, navigate `/orders/success` with `{ orderNumber, totalAmount, orderId }`.
     - Verify failure → toast error, navigate `/orders/failure`.
  7. **On modal dismiss**: reset `paying` state, show info toast "Payment cancelled".

### [Checkout] Server — Create Checkout Order
- **Current location**: `server/src/modules/checkout/service.ts` → `createCheckoutOrder()`
- **CRITICAL SECURITY RULES**:
  - All amounts computed server-side from DB prices — **client input amounts NEVER trusted**.
  - Coupon re-validated server-side even if client already called `/apply-coupon`.
  - Razorpay `KEY_SECRET` NEVER returned or logged.
- **Steps**:
  1. Fetch cart items + product details. Throw `CART_EMPTY` if empty.
  2. Validate stock (`is_active && stock >= quantity`) for ALL items. Collect all errors; throw `STOCK_UNAVAILABLE` with all messages.
  3. Compute `subtotalPaisa` from DB `price_paisa × quantity`.
  4. Re-validate coupon via `validateCoupon(code, subtotalPaisa)`. Throw `COUPON_INVALID` on failure.
  5. Compute `discountedSubtotal = subtotal - couponDiscount`.
  6. Compute `shippingAmountPaisa` via `calculateShipping(discountedSubtotal)`.
  7. `totalAmountPaisa = discountedSubtotal + shipping`. Throw `ORDER_AMOUNT_TOO_LOW` if `< 100` paisa.
  8. Fetch address, verify `address.user_id === userId` (ownership). Throw `ADDRESS_NOT_FOUND` otherwise.
  9. Generate order number via DB RPC `generate_order_number(prefix: ORDER_PREFIX)`.
  10. Create Razorpay order via server SDK (`razorpay.orders.create`). Throw `PAYMENT_GATEWAY_ERROR` on failure.
  11. Insert `orders` row: `status='pending'`, `payment_status='pending'`, `fulfillment_status='unfulfilled'`, address snapshot, all server-computed amounts, coupon snapshot.
  12. Insert `order_items` rows (product snapshot: name, sku, image URL, price at purchase time).
  13. Insert `payments` row: `status='created'`, link to Razorpay order ID.
  14. Log `payment_logs` event `'created'`.
  15. Return `{ razorpay_order_id, amount_paisa, currency: 'INR', key_id }`.

### [Checkout] Server — Shipping Calculation
- **Current location**: `server/src/modules/checkout/service.ts` → `calculateShipping()`
- **Logic**: Reads `shipping_rules` from `site_settings` table. Fallback: `{ shipping_charge_paisa: 15000, free_shipping_threshold_paisa: 100000 }` (₹150 flat / free above ₹1000).
  ```
  if (free_threshold > 0 && discountedSubtotal >= free_threshold) return 0
  return shipping_charge_paisa
  ```

### [Payments] Payment Capture — Single Idempotent Function
- **Current location**: `server/src/modules/payments/service.ts` → `capturePayment()`
- **Purpose**: The **only** place in the codebase where `payment_status` is set to `'paid'`.
- **Called by**: (1) `verifyPayment` (client-triggered), (2) `processRazorpayWebhook` (webhook).
- **Idempotency guard**: If `payment.status === 'captured'` → return immediately without re-running side effects. Critical because Razorpay retries webhooks.
- **Steps** (on first capture only):
  1. Update `payments` → `status='captured'`, save `razorpay_payment_id`, `razorpay_signature`, `captured_at`.
  2. Update `orders` → `status='confirmed'`, `payment_status='paid'`.
  3. **Atomic stock decrement**: DB RPC `decrement_stock(product_id, qty)` with `WHERE stock >= qty`. If stock depleted at capture time (race condition from concurrent order) → set `fulfillment_status='exception'`, log for admin reconciliation. Do NOT refund automatically (payment already succeeded).
  4. **Coupon usage increment**: DB RPC `increment_coupon_usage(coupon_id)`. Non-fatal — log and continue.
  5. Clear user's cart: `DELETE cart_items WHERE user_id = order.user_id`.
  6. Log `payment_logs` event `'webhook_processed'`.
  7. Emit `order:payment:captured` event via EventBus (fire-and-forget).
  8. Send order confirmation email (fire-and-forget; failure does not block response).

### [Payments] Payment Verification (Client-Triggered)
- **Current location**: `server/src/modules/payments/service.ts` → `verifyPayment()`
- **Logic**:
  1. Fetch payment by `razorpay_order_id`. Verify `order.user_id === req.user.id` (ownership). 404 on mismatch (no info leak).
  2. Log `verify_attempt` in `payment_logs` BEFORE signature check (full audit trail).
  3. Verify HMAC signature via `verifyPaymentSignature()` using `timingSafeEqual` (prevents timing attacks).
  4. On failure: log `verify_failure`, set `payment.status='failed'`, `order.payment_status='failed'`. Throw `PAYMENT_SIGNATURE_INVALID` (400).
  5. On success: log `verify_success`, call `capturePayment()`.

### [Payments] Razorpay Webhook Processing
- **Current location**: `server/src/modules/payments/service.ts` → `processRazorpayWebhook()`
- **Security requirements**:
  - `rawBody` must be raw request `Buffer` (not parsed JSON) — Razorpay signs exact bytes.
  - Verified with `RAZORPAY_WEBHOOK_SECRET` (separate from API key secret).
- **Logic**:
  1. Log receipt before verification (audit trail).
  2. Verify webhook signature. Return 400 on failure (Razorpay stops retrying on 4xx).
  3. **Duplicate detection**: DB RPC `check_webhook_duplicate(event_id)`. If duplicate → log, return `{ status: 'duplicate' }`.
  4. `payment.captured` event → extract entity, call `capturePayment()`.
  5. `payment.failed` event → set `payment.status='failed'`, `order.payment_status='failed'`.
  6. All other events → log and return `{ status: 'ignored' }`.

---

## 4. Orders & Fulfillment

### [Orders] Order Status State Machine
- **Current location**: `server/src/modules/orders/stateMachine.ts`
- **All valid transitions**:
  ```
  pending          → confirmed, cancelled
  confirmed        → processing, cancelled
  processing       → shipped, cancelled
  shipped          → out_for_delivery, delivered, rto, lost, damaged
  out_for_delivery → delivered, delivery_failed, rto
  delivered        → returned
  cancelled        → [] TERMINAL
  rto              → returned
  returned         → refunded
  refunded         → [] TERMINAL
  lost             → [] TERMINAL
  damaged          → [] TERMINAL
  delivery_failed  → out_for_delivery, rto
  ```
- **Admin manual overrides**: allowed even for invalid transitions but LOGGED as warnings.
- **Auto-sync sources** (webhook/polling): BLOCKED on invalid transitions.
- **`isValidTransition(from, to)`**: Returns bool.
- **`isTerminalStatus(status)`**: Returns true if status has no exit transitions.

### [Orders] Shiprocket Status → Order Status Mapping
- **Current location**: `server/src/modules/orders/stateMachine.ts` → `shiprocketStatusToOrderStatus()`
- **Logic** (normalized lowercase string matching, precedence order):
  ```
  'delivered' or includes 'delivered'       → delivered
  'cancelled' or 'cancelled before shipping'→ cancelled
  'lost'                                    → lost
  'damaged'                                 → damaged
  includes 'rto':
    includes 'delivered'                    → returned
    else                                    → rto
  'out for delivery' or includes it         → out_for_delivery
  'undelivered'/'exception'/'delivery failed' → delivery_failed
  'shipped'/includes 'in transit'/'transit'
   /'reached'/'arrived at hub'/'picked up'  → shipped
  'new'/includes 'awb'/'pickup'/'manifest'
   /'label'/'scheduled'/'generated'/'ready' → processing
  unknown                                   → null (silently ignored)
  ```

### [Orders] Auto Sync — Tracking Orders
- **Current location**: `server/src/modules/orders/service.ts` → `adminSyncTrackingOrders()`
- **Logic**:
  1. Fetch all orders with `awb_code IS NOT NULL` and `status NOT IN` terminal states.
  2. Batch-fetch tracking from Shiprocket via `trackBulk(awbs)`.
  3. Map each Shiprocket `current_status` → our `OrderStatus` via `shiprocketStatusToOrderStatus()`.
  4. If status changed, call `updateOrderStatusByAwb(awb, targetStatus, 'polling_sync')` — enforces state machine.
  5. Returns `{ totalChecked, totalUpdated }`.

### [Orders] Status Change Recording
- **Current location**: `server/src/modules/orders/service.ts` → `recordStatusChange()`
- **Logic**: Inserts into `order_status_history` with `{ order_id, old_status, new_status, source, actor_id, metadata }`. Fire-and-forget.

### [Orders] Ownership Enforcement (User)
- **Current location**: `server/src/modules/orders/service.ts` → `getUserOrder()`
- **Rule**: Always filters with BOTH `.eq('id', orderId)` AND `.eq('user_id', userId)`. Returns 404 for non-existent OR other-user's order (no enumeration).

### [Orders] Admin — Add Order Note
- **Current location**: `server/src/modules/orders/service.ts` → `adminAddOrderNote()`
- **Logic**: Appends timestamped entry to `orders.notes` (newline-separated text). Format: `[ISO_TIMESTAMP] Note text`.

### [Orders] Admin — Fulfillment Step Progression
- **Current location**: `client/src/types/order.ts`
- **Steps**: `idle` → `order_created` → `awb_assigned` → `pickup_scheduled` → `label_generated` → `manifest_generated` → `ready_for_pickup`

### [Orders] Admin — Fulfillment Dialog (Client)
- **Current location**: `client/src/routes/admin/AdminOrderDetail.tsx`
- **Logic**:
  - Lazy-loads Shiprocket pickup locations when dialog opens.
  - `adminApiService.checkServiceability({ pickup_postcode, delivery_postcode, weight, cod })` → recommended couriers list.
  - Admin selects courier, inputs package dimensions (weight g, L/B/H cm), submits to `adminApiService.fulfillOrder()`.
  - Downloads labels/invoices/manifests via authenticated backend endpoints (passes auth headers).
  - Admin notes panel: append-only, timestamped.

### [Orders] Customer Order Status Tracker
- **Current location**: `client/src/components/shared/OrderStatusTracker.tsx`
- **Visual status mapping** (simplifies backend states to 4 customer-visible steps):
  - **Paid**: `pending`, `confirmed`
  - **Confirmed**: `confirmed`, `processing`
  - **Crafting/Packing**: `processing`
  - **Shipped**: `shipped`, `out_for_delivery`, `rto`, `delivery_failed`

### [Orders] Admin — Background Tracking Sync (Client)
- **Current location**: `client/src/routes/admin/OrdersList.tsx`
- **Logic**: After each orders page fetch, if any visible orders have `awb_code` AND are not in terminal status → silently call `adminApiService.syncTrackingOrders()` in background (non-blocking, fire-and-forget).

---

## 5. Products & Catalog

### [Products] Query Parameters
- **Current location**: `client/src/types/product.ts` → `ProductQueryParams`
- **Fields**: `page`, `limit`, `q` (search text), `category` (category slug), `minPrice` (paisa), `maxPrice` (paisa), `inStock: boolean`, `sort: 'price_asc' | 'price_desc' | 'newest' | 'popularity'`

### [Products] Catalog Page — URL-Synced Filter State
- **Current location**: `client/src/routes/store/Products.tsx`
- **Logic**: All filter state is driven by `URLSearchParams` (`?q=&category=&minPrice=&maxPrice=&inStock=&sort=&page=`). `updateParam` helper: deletes key on falsy value; resets `page` to 1 whenever any non-page param changes.
- **Price conversion**: Filter inputs are in Rupees (float strings). On fetch: `parseFloat(minPrice) * 100` → paisa integer.

### [Products] Homepage — Featured Products
- **Current location**: `client/src/routes/store/Home.tsx`
- **Logic**: Fetches top 4 products sorted by `'popularity'` via `productsApiService.getProducts({ sort: 'popularity', limit: 4 })`. Also fetches first 4 categories for display grid. Both fetched concurrently via `Promise.all`.
- **Hero carousel**: 8-second auto-rotation via `setInterval`. Manual prev/next buttons. Mobile pagination dots. `heroSlides` and `promoBanners` from `useSiteSettings()`.

### [Products] Price Display Logic
- **Current location**: `client/src/components/shared/PriceDisplay.tsx`
- **Logic**: If `salePrice` exists AND `salePrice < price`: show original price with strikethrough + sale price + `"X% OFF"` badge. `discountPercent = Math.round(((price - salePrice) / price) * 100)`.

### [Products] Stock Badge Thresholds
- **Current location**: `client/src/components/shared/StockBadge.tsx`
- **Rules**: `stock <= 0` → "Out of Stock" | `stock <= 5` → "Only X Left" | `stock > 5` → "In Stock"

### [Products] Product Detail — Add to Cart
- **Current location**: `client/src/routes/store/ProductDetail.tsx`
- **Logic**: Quantity selector (min 1, max `product.stock`). Calls `useCart().addToCart(product.id, quantity)`. Hidden if `stock === 0` (shows "Out of Stock" message instead).

### [Products] Product Detail — Related Products
- **Current location**: `client/src/routes/store/ProductDetail.tsx`
- **Logic**: After loading product by slug, calls `productsApiService.getRelatedProducts(product.id)` to fetch up to 4 items in the same category.

### [Products] Product Detail — Review Submission
- **Current location**: `client/src/routes/store/ProductDetail.tsx`
- **Logic**:
  1. Only rendered if user is authenticated.
  2. Rating selector (1–5 stars, default 5). Comment optional (max 2000 chars).
  3. `reviewsApiService.submitReview(product.id, rating, comment)`.
  4. On success: refresh reviews list AND re-fetch product (to update cached `avgRating`).
  5. On failure: show inline `reviewError` message (may include "not a verified buyer").
  6. Shows "Update Review" label if user already has a review for this product.

### [Products] Admin — Product Form (Rupee↔Paisa)
- **Current location**: `client/src/routes/admin/ProductForm.tsx`
- **Logic**: Price inputs in Rupees (float). On save: `Math.round(parseFloat(priceRupees) * 100)` → paisa. Same for `salePrice`. At least 1 image required. Drag-and-drop image ordering updates `sortOrder` directly.

### [Products] Admin — Soft Delete
- **Current location**: `client/src/routes/admin/ProductsList.tsx`
- **Rule**: Product deletion sets `isActive = false`. Product remains in DB for historical order references.

### [Products] Admin — Metadata
- **Current location**: `client/src/routes/admin/ProductForm.tsx`
- **Logic**: Product specs stored as `Record<string, string>`. Managed as `metadataRows: { key, value }[]` in form state; serialized to object before API submission.

---

## 6. Categories

### [Categories] Category Model
- **Fields**: `id`, `name`, `slug`, `description`, `imageUrl`, `sortOrder`, `isActive?`, `showInNavbar?`
- **Source**: `client/src/types/category.ts`

### [Categories] Admin — Slug Auto-Generation
- **Current location**: `client/src/routes/admin/CategoriesList.tsx`
- **Logic**: While name is typed and slug field has not been manually edited → auto-generate slug from name via `slugify()`. Once user manually edits slug → auto-generation stops.

### [Categories] Navbar Display Rule
- **Current location**: `client/src/routes/admin/CategoriesList.tsx`
- **Rule**: Max 5 categories can have `showInNavbar = true` simultaneously. Enforced client-side in admin form validation.

---

## 7. Coupons

### [Coupons] Coupon Validation (Server)
- **Current location**: `server/src/modules/coupons/service.ts` → `validateCoupon()`
- **Inputs**: `code: string`, `subtotalPaisa: number`
- **Validation steps** (in order):
  1. Lookup by `code.toUpperCase()` (codes always stored uppercase). 404 if not found.
  2. `coupon.is_active` must be true → `COUPON_INACTIVE`.
  3. `now >= coupon.valid_from` → `COUPON_NOT_YET_VALID`.
  4. `now < coupon.valid_until` (null = no expiry) → `COUPON_EXPIRED`.
  5. `coupon.times_used < coupon.max_uses` (null = unlimited) → `COUPON_EXHAUSTED`.
  6. `subtotalPaisa >= coupon.min_order_amount_paisa` → `COUPON_MIN_ORDER` with exact minimum shown in rupees.
- **Discount calculation**:
  - **Percentage**: `discountPaisa = round(subtotal × discountValue / 100)`. Capped by `max_discount_paisa` if set and > 0.
  - **Fixed**: `discountPaisa = min(discount_value, subtotal)` (cannot exceed subtotal).

### [Coupons] Coupon Re-Validation on Cart Change (Client)
- **Current location**: `client/src/context/CartContext.tsx`
- **Rule**: After every `updateQuantity()` or `removeFromCart()`, the applied coupon is re-validated against the new subtotal. If it fails → coupon is removed with toast: `"Coupon removed - cart total fell below minimum."`.

### [Coupons] Admin — Create Coupon
- **Current location**: `client/src/routes/admin/CouponsList.tsx`
- **Rules**: Code forced uppercase, alphanumeric only. Fixed-amount: input in Rupees → paisa on save. Default validity: today to today+30 days.
- **Server**: Throws `DUPLICATE_CODE` (409) on unique constraint violation (`coupons.code` is unique).

### [Coupons] Admin — Deactivate Coupon
- **Current location**: `server/src/modules/coupons/service.ts` → `deactivateCoupon()`
- **Logic**: Sets `is_active = false`. Soft operation — preserves history for applied orders.

---

## 8. Reviews

### [Reviews] Verified Buyer Gate (Server)
- **Current location**: `server/src/modules/reviews/service.ts` → `hasDeliveredOrderForProduct()`
- **Rule**: User may only submit a review if they have at least one order that:
  - Contains `product_id` in `order_items`
  - `orders.user_id = userId`
  - `orders.status = 'delivered'`
  - `orders.payment_status = 'paid'`
- **Error code on failure**: `NOT_VERIFIED_BUYER` (403).

### [Reviews] Create/Update Review (Upsert)
- **Current location**: `server/src/modules/reviews/service.ts` → `createOrUpdateReview()`
- **Logic**: Upsert on unique constraint `(product_id, user_id)` — one review per product per user. Rating: 1–5 integer. Comment: optional text. Invalidates product review cache on success.

### [Reviews] Rating Aggregation
- **Current location**: `server/src/modules/reviews/service.ts` → `getReviewAggregates(productIds[])`
- **Logic**: Batch fetch all ratings for given product IDs. Per product: `avgRating = Math.round((sum/count) * 10) / 10` (1 decimal place). Returns `Record<productId, { rating, reviewCount }>`.
- **Error handling**: Returns empty object on error (reviews failure does not crash product listing).

### [Reviews] Admin — Moderation
- **Rules**: Hard-delete on admin request. Cache is invalidated on delete (product list re-fetched to reflect new aggregates). Filters: by `productId`, by `rating` (1–5), by text search on comment (`ilike`).

---

## 9. Addresses

### [Addresses] Default Address Management (Server)
- **Current location**: `server/src/modules/addresses/service.ts`
- **Rule**: Only one address per user can be `is_default = true`.
- **Logic**: When creating/updating with `is_default = true` → first bulk-unset all other addresses for that user (`UPDATE addresses SET is_default = false WHERE user_id = userId`), then set new one.

### [Addresses] Ownership Enforcement (Server)
- **Applied uniformly to all operations**:
  1. Application-level check: `existing.user_id !== userId` → 404 (reveals no information about other users).
  2. DB-level double-enforcement: `.eq('id', addressId).eq('user_id', userId)` in all queries.
  3. `user_id` is **always** set from JWT — never from client input body.

### [Addresses] Checkout — Address Snapshot
- **Current location**: `server/src/modules/checkout/service.ts`
- **Rule**: Shipping address is **snapshotted** at order creation time into `orders.shipping_*` columns. Changes to address book do not affect historical orders.

---

## 10. Shiprocket / Shipping Integration

### [Shiprocket] Circuit Breaker
- **Current location**: `server/src/services/circuitBreaker.ts`
- **Purpose**: Prevents hammering Shiprocket API during outages.
- **States**: `closed` (normal) → `open` (blocked, fail-fast) → `half-open` (trial) → `closed` (reset)
- **Rules**:
  - `FAILURE_THRESHOLD = 5` consecutive failures → open breaker.
  - `COOLDOWN_MS = 60_000ms` (1 minute) → transition to half-open.
  - Half-open: 1 trial call allowed. Success → closed. Failure → open again.
- **Functions**: `canMakeShiprocketCall()`, `reportShiprocketSuccess()`, `reportShiprocketFailure()`, `resetShiprocketBreaker()`, `getBreakerStatus()`.
- **Limitation**: In-process only (not shared across multiple Node.js processes).

### [Shiprocket] Webhook Security
- **Current location**: `server/src/modules/shiprocket/webhookSecurity.ts`
- **Logic**: HMAC-SHA256 verification using `SHIPROCKET_WEBHOOK_TOKEN`. Raw `Buffer` body required.

### [Shiprocket] Order Payload Building
- **Current location**: `server/src/modules/orders/service.ts` → `buildShiprocketOrderPayload()`
- **Weight resolution** (priority order): admin override → `order.package_weight_grams` → sum of `product.weight_grams × qty` (fetched from DB) → default 500g.
- **Dimension resolution** (priority order): admin override → saved order dimensions → `site_settings.shiprocket_settings` defaults → hardcoded (15×10×5 cm).
- **Order number**: Non-numeric characters stripped for Shiprocket compatibility.
- **Payment method**: `order.payment_status === 'paid'` → `'Prepaid'` else `'COD'`.
- **Weight unit**: Grams converted to kg (min 0.1 kg) for Shiprocket API.

### [Shiprocket] AWB Assignment
- **Current location**: `server/src/modules/orders/service.ts` → `adminAssignAwb()`
- **Logic**: `shiprocketAssignAwb({ shipment_id, courier_id, is_return: 0 })`. On success: saves `awb_code`, `courier_name` to order; sets `fulfillment_status = 'fulfilled'`. Invalidates order cache.

### [Shiprocket] Shiprocket Tracker (Customer)
- **Current location**: `client/src/components/shared/ShiprocketTracker.tsx`
- **Logic**: Given `awbCode`, calls `GET /api/tracking/:awbCode`. Renders chronological timeline of `shipment_track_activities`. Color-codes dots based on `sr-status-label` string matching (DELIVERED → green, OUT FOR DELIVERY → blue, TRANSIT → amber).

---

## 11. Admin Dashboard & Inventory

### [Admin] Dashboard Metrics
- **Current location**: `client/src/routes/admin/Dashboard.tsx`
- **Data fetched concurrently** (via `Promise.all`):
  1. `adminApiService.getDashboardStats()` → `{ totalOrders, totalRevenue, totalProducts, totalCategories, activeCoupons, lowStockCount }`
  2. `getOrders({ page: 1, limit: 5 })` → 5 most recent orders
  3. `getInventory()` → inventory snapshot

### [Admin] Order Status Badge Colors
- **Current location**: `client/src/routes/admin/OrdersList.tsx`
- **Mapping**: `delivered` → green | `cancelled/returned/refunded/rto/lost/damaged/delivery_failed` → red | `processing/shipped` → blue | `pending/confirmed` → amber

### [Admin] Inventory — Low Stock Definition
- **Current location**: `client/src/routes/admin/InventoryList.tsx`
- **Rule**: `stock <= 5` is "Low Stock". Admin can toggle `lowStockOnly` boolean filter. Inline stock editing updates absolute count directly.

---

## 12. Site Settings

### [Settings] SiteSettingsContext — Cache-First Strategy
- **Current location**: `client/src/context/SiteSettingsContext.tsx`
- **Cache key**: `'site_settings_cache'` in `localStorage`.
- **Logic**:
  1. Init: read from `localStorage` synchronously (instant render, no flash of unstyled content).
  2. `loading = true` only when there is NO cached data.
  3. On mount: fetch fresh from `GET /api/settings`, update state + `localStorage` cache.
  4. `refresh()` method: re-fetches without spinner if cached data exists.
- **Edge cases**: `localStorage` unavailable → fail silently.

### [Settings] Shipping Rules (Dynamic Config)
- **Current location**: `client/src/types/settings.ts`
- **Shape**: `{ shippingChargePaisa: number, freeShippingThresholdPaisa: number }`
- **Used by**: `CartContext` (client-side total calculation) and `checkout/service.ts` (server-side order total).

### [Settings] Admin — Hero Slides
- **Current location**: `client/src/routes/admin/SiteSettings.tsx`
- **Rules**: Minimum 1 slide required. Each slide must have `title`, `imageUrl`, and `link`. Drag-and-drop horizontal reordering updates `sortOrder`. Shipping charges input in Rupees → paisa on save.

---

## 13. Infrastructure Services

### [Infra] Event Bus
- **Current location**: `server/src/services/eventBus.ts`
- **Purpose**: Decouples business logic from side effects (email, analytics, cache).
- **Implementation**: In-process Node.js `EventEmitter`. All listeners fire-and-forget. Errors caught and logged — never propagate to caller. Max 50 listeners.
- **Domain events**:
  - `order:payment:captured`, `order:status:changed`, `order:shipped`, `order:out-for-delivery`, `order:delivered`, `order:cancelled`, `order:rto:initiated`, `order:returned`, `order:refunded`, `order:delivery-failed`, `order:lost`, `order:damaged`
- **`emitStatusChangeEvents()`**: Always emits generic `order:status:changed` PLUS one granular event based on `newStatus`.
- **Limitation**: Not durable across restarts; not shared across multiple processes. Upgrade to Redis pub/sub for production scale.

### [Infra] Cache Invalidation
- **Current location**: `server/src/services/cacheInvalidation.ts`
- **Events → affected cache keys**:
  - `PRODUCT_UPDATED/CREATED/DELETED` → pattern-delete `GET:/api/products`
  - `ORDER_PLACED` → delete `cart:user:{userId}`, `orders:user:{userId}`, `inventory:product:{productId}` per ordered product
  - `ORDER_UPDATED` → delete `orders:id:{orderId}`, `orders:user:{userId}`
  - `REVIEW_ADDED/DELETED` → delete `reviews:product:{productId}` + pattern-delete `GET:/api/products`
  - `CART_UPDATED` → delete `cart:user:{userId}`
  - `CATEGORY_UPDATED` → delete `GET:/api/categories`, pattern-delete `GET:/api/categories/{slug}`, pattern-delete `GET:/api/products`
- **Error handling**: Cache errors NEVER crash the request (caught and logged).

---

## 14. Types & Interfaces (Domain Models)

All types live in `client/src/types/` (client) and `server/src/types/index.ts` (server).

### Profile (`client/src/types/auth.ts`)
```typescript
interface Profile {
  id: string; fullName: string; phone: string
  role: 'user' | 'admin'; createdAt: string; email?: string
}
```

### Cart & Address (`client/src/types/cart.ts`)
```typescript
interface CartItem {
  id: string; productId: string; productName: string; productSlug: string
  productImage: string
  unitPrice: number  // paisa
  quantity: number
  lineTotal: number  // paisa
  inStock: boolean; availableStock: number
}
interface Cart { items: CartItem[]; subtotal: number; itemCount: number }  // subtotal in paisa
interface Address {
  id: string; label: string; fullName: string; phone: string
  line1: string; line2: string | null; city: string; state: string
  pincode: string; country: string; isDefault: boolean
}
```

### Category (`client/src/types/category.ts`)
```typescript
interface Category {
  id: string; name: string; slug: string; description: string
  imageUrl: string; sortOrder: number; isActive?: boolean; showInNavbar?: boolean
}
```

### Order Statuses (`client/src/types/order.ts`)
```typescript
type OrderStatus = 'pending'|'confirmed'|'processing'|'shipped'|'out_for_delivery'|
  'delivered'|'cancelled'|'rto'|'returned'|'refunded'|'lost'|'damaged'|'delivery_failed'
type PaymentStatus = 'pending'|'paid'|'failed'|'refunded'
type FulfillmentStatus = 'unfulfilled'|'partial'|'fulfilled'|'exception'
type FulfillmentStep = 'idle'|'order_created'|'awb_assigned'|'pickup_scheduled'|
  'label_generated'|'manifest_generated'|'ready_for_pickup'
```

### OrderDetail (full shape, `client/src/types/order.ts`)
- Contains all financial fields (subtotal, discountAmount, shippingAmount, totalAmount — all in paisa), snapshotted `shippingAddress`, Shiprocket integration fields (shiprocketOrderId, shipmentId, awbCode, courierName, trackingUrl, labelGenerated, manifestGenerated), package dimensions (weightGrams, lengthCm, breadthCm, heightCm), and admin-only fields (customer, adminNotes, deliveryInstructions).

### Product (`client/src/types/product.ts`)
- `ProductListItem`: for catalog grids — has `primaryImageUrl`, `categoryName`, `discountPercent`, `rating?`, `reviewCount?`.
- `ProductDetail`: extends list item with full `images[]`, `metadata: Record<string, string>`, `sku`, `isActive`, `category: { id, name, slug }`.

### Coupon (`client/src/types/coupon.ts`)
```typescript
interface Coupon {
  id: string; code: string; discountType: 'percentage'|'fixed'
  discountValue: number; minOrderAmount: number; maxDiscountAmount: number
  usageLimit: number; validFrom: string; validUntil: string; isActive: boolean
}
interface CouponPreview {  // returned at checkout time
  code: string; discountType: 'percentage'|'fixed'
  discountValue: number; discountAmount: number; newSubtotal: number
}
```

### Settings (`client/src/types/settings.ts`)
```typescript
interface ShippingRules { shippingChargePaisa: number; freeShippingThresholdPaisa: number }
interface SiteSettings {
  contactInfo: { email: string; phone: string; address: string }
  announcementBar: { enabled: boolean; badge: string; message: string }
  heroSlides: HeroSlide[]; promoBanners: PromoBanner[]
  storeDescription: string; shippingRules: ShippingRules
}
```

### API Response Envelopes (`client/src/types/common.ts`)
```typescript
interface StandardResponse<T> { success: true; data: T }
interface PaginatedResponse<T> {
  success: true; data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
interface ErrorResponseEnvelope {
  success: false
  error: { code: string; message: string; fieldErrors?: Record<string, string[]>; details?: unknown }
}
type ApiResponse<T> = StandardResponse<T> | ErrorResponseEnvelope
type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponseEnvelope
```

### Dashboard (`client/src/types/dashboard.ts`)
```typescript
interface DashboardStats {
  totalOrders: number; totalRevenue: number  // paisa
  totalProducts: number; totalCategories: number; activeCoupons: number; lowStockCount: number
}
interface InventoryItem { productId: string; productName: string; sku: string; stock: number; isLowStock: boolean }
```

### Shiprocket Types (`client/src/types/order.ts`)
```typescript
interface FulfillOrderRequest {
  pickup_location: string; weight_grams: number; length_cm: number
  breadth_cm: number; height_cm: number; package_count?: number
  courier_id?: number; payment_method?: 'Prepaid'|'COD'; cod_amount?: number
}
interface CourierOption {
  courier_name: string; courier_id: number; rate: number
  estimated_delivery_days: number; cod: boolean; is_recommended?: boolean
}
interface ServiceabilityResult {
  available_courier: CourierOption[]; recommended_courier?: CourierOption
}
```

---

## 15. Utility Functions & Constants

### `formatPrice(paisa: number): string`
- **Location**: `client/src/lib/format.ts`
- **Logic**: `paisa / 100` → `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
  - Omits decimal places if whole number: `minimumFractionDigits = rupees % 1 === 0 ? 0 : 2`.
- **Examples**: `formatPrice(15000)` → `'₹150'` | `formatPrice(15050)` → `'₹150.50'`

### `formatDate(dateString: string): string`
- **Location**: `client/src/lib/format.ts`
- **Logic**: Parse ISO string → `toLocaleDateString('en-IN', { day, month: 'short', year, hour, minute, hour12: true })`. Returns raw string on parse failure.

### `slugify(text: string): string`
- **Location**: `client/src/lib/slug.ts`
- **Logic**: lowercase → trim → spaces to `-` → remove non-word chars → collapse `--` → trim leading/trailing `-`.

### `uploadImage(file: File, folder): Promise<UploadImageResult>`
- **Location**: `client/src/lib/storage.ts`
- **Business rules**:
  - Only `image/*` MIME types allowed.
  - Max file size: 8MB (`8 * 1024 * 1024` bytes).
  - Filename: lowercase, non-alphanumeric → `-`, max 60 chars, prefixed with `Date.now() + random`.
  - Bucket: `'images'`. Folders: `'products'` | `'categories'` | `'hero-slides'` | `'promo-banners'`.
  - Returns `{ url: publicUrl, path, fileName }`.

### `deleteStorageFile(pathOrUrl: string): Promise<void>`
- **Location**: `client/src/lib/storage.ts`
- **Logic**: Parses Supabase storage URL or path → extracts storage path → verifies `images` bucket membership → deletes from Supabase Storage.

### `isSupabaseStorageUrl(url: string): boolean`
- **Location**: `client/src/lib/storage.ts`
- **Logic**: Returns `url.includes('/storage/v1/object/public/images/')`.

### Constants (`client/src/lib/constants.ts`)
```
STORE_NAME             = VITE_STORE_NAME || 'Muvira'
RAZORPAY_KEY_ID        = VITE_RAZORPAY_KEY_ID
DEFAULT_PAGE_LIMIT     = 20
TAX_RATE_PERCENT       = 0        (no tax currently applied)
SHIPPING_CHARGES       = 0        (legacy; shipping is dynamic from site_settings)
API_BASE_URL           = VITE_API_URL (trailing slash stripped; empty = Vite proxy in dev)
INDIAN_STATES          = [{ value, label }] for all 28+ Indian states (used in address forms)
```

### Anti-Corruption Layer Adapters (`client/src/lib/api/adapters.ts`)
- **Purpose**: Maps snake_case backend JSON → camelCase TypeScript interfaces. Isolates frontend from backend schema.
- **Key functions**: `mapProfile`, `mapProductListItem`, `mapProductDetail`, `mapOrderListItem`, `mapOrderDetail`, `mapCategory`, `mapCouponPreview`, `buildCart`, `mapAddress`
- **Important transformations**: `price_paisa` → `price` (kept as paisa); `compare_at_price_paisa` → `salePrice`; nested `product_images` → `images[]` with `isPrimary`; `metadata` JSON parsed from DB string; `order_items` array flattened.

---

## 16. Custom Hooks

### `useAuth`
- **Location**: `client/src/hooks/useAuth.ts` (barrel → `AuthContext`)
- **Returns**: `{ user, token, loading, login, signup, logout, updateProfile, isAuthenticated, isAdmin }`

### `useCart`
- **Location**: `client/src/hooks/useCart.ts` (barrel → `CartContext`)
- **Returns**: `{ cart, coupon, loading, addToCart, updateQuantity, removeFromCart, applyCouponCode, removeCouponCode, clearCartState, shippingAmount, totalAmount }`
- **Derived**: `shippingAmount` and `totalAmount` are pre-computed inside context.

### `useDebounce<T>(value: T, delay: number): T`
- **Location**: `client/src/hooks/useDebounce.ts`
- **Logic**: `useEffect` → `setTimeout(delay)` that resets on every value change. Returns stable `debouncedValue` only after `delay` ms of inactivity.

### `useToast`
- **Location**: `client/src/hooks/useToast.ts` (barrel → `ToastContext`)
- **Returns**: `{ toasts, showToast, dismissToast }`
- **`showToast(message, type, duration = 4000ms)`**: Adds toast with random ID; schedules auto-dismiss via `setTimeout`. Types: `'success' | 'error' | 'info'`.

### `useSiteSettings`
- **Location**: `client/src/context/SiteSettingsContext.tsx`
- **Returns**: `{ settings: SiteSettings | null, loading: boolean, refresh: () => Promise<void> }`
- **Side effect**: Reads `localStorage` cache synchronously on init; fetches fresh data in background on mount.

---

## 17. Side Effects Catalogue

| # | Trigger | Location | Effect |
|---|---------|----------|--------|
| 1 | Mount (once) | `AuthContext.tsx` | Restores Supabase session; subscribes to `onAuthStateChange`; fetches `/api/profile` |
| 2 | `isAuthenticated` change | `CartContext.tsx` | Fetches cart from server on login; resets to `EMPTY_CART` on logout |
| 3 | Mount (once) | `SiteSettingsContext.tsx` | Reads `localStorage` cache; fetches fresh settings from API; updates cache |
| 4 | After each orders page load | `AdminOrdersList.tsx` | Silently calls `syncTrackingOrders()` if active AWBs found on page |
| 5 | Mount (once) | `CheckoutPage.tsx` | Fetches user addresses; auto-selects default |
| 6 | Hero slides length change | `Home.tsx` | Sets up 8-second `setInterval` for auto-rotation; clears on unmount |
| 7 | Payment capture (server) | `payments/service.ts` | Emits `order:payment:captured` event (fire-and-forget); sends email |
| 8 | Status change (server) | `orders/service.ts` | Emits `order:status:changed` + granular event; records status history; invalidates cache |
| 9 | Filter/page param change | `Products.tsx` | Fetches products; `window.scrollTo({ top: 0, behavior: 'smooth' })` |

---

## 18. Extraction Plan

Proposed target folder structure for Phase 2. All business logic above should be extracted into pure TypeScript modules — fully decoupled from any UI framework.

```
/lib/
│
├── types/
│   ├── auth.ts          # Profile, AuthState
│   ├── cart.ts          # CartItem, Cart, Address
│   ├── category.ts      # Category
│   ├── common.ts        # ApiResponse<T>, PaginatedResponse<T>, ErrorResponseEnvelope
│   ├── coupon.ts        # Coupon, CouponPreview
│   ├── dashboard.ts     # DashboardStats, InventoryItem
│   ├── order.ts         # OrderStatus, PaymentStatus, FulfillmentStatus, FulfillmentStep, OrderDetail, etc.
│   ├── product.ts       # ProductListItem, ProductDetail, ProductImage, ProductQueryParams
│   └── settings.ts      # SiteSettings, HeroSlide, ShippingRules, etc.
│
├── services/
│   ├── auth.service.ts        # login, signup, logout, updateProfile, getEmailRedirectUrl
│   ├── cart.service.ts        # getCart, addToCart, updateQuantity, removeFromCart
│   ├── coupon.service.ts      # applyCoupon, removeCoupon
│   ├── order.service.ts       # createOrder, verifyPayment, getOrders, getOrderById, getOrderTracking
│   ├── product.service.ts     # getProducts, getProductBySlug, getRelatedProducts
│   ├── category.service.ts    # getCategories, getCategoryBySlug
│   ├── review.service.ts      # getProductReviews, submitReview
│   ├── address.service.ts     # getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress
│   ├── settings.service.ts    # getSettings
│   ├── tracking.service.ts    # trackSingle, trackBulk
│   └── admin/
│       ├── admin-products.service.ts    # CRUD, soft delete, image management
│       ├── admin-orders.service.ts      # listOrders, updateStatus, addNote, fulfillOrder, syncTracking
│       ├── admin-categories.service.ts  # CRUD
│       ├── admin-coupons.service.ts     # CRUD + deactivate
│       ├── admin-reviews.service.ts     # listReviews, deleteReview
│       ├── admin-inventory.service.ts   # getInventory, updateStock
│       ├── admin-settings.service.ts    # getSettings, updateSettings
│       └── admin-shiprocket.service.ts  # checkServiceability, getPickupLocations, assignAwb, schedulePickup
│
├── validators/
│   ├── checkout.validator.ts   # Address: required fields, phone (10 digits), pincode (6 digits), country='India'
│   ├── coupon.validator.ts     # Code format (uppercase alphanumeric), discount type rules
│   ├── product.validator.ts    # price > 0, at least 1 image, name required
│   ├── category.validator.ts   # name required, max 5 navbar categories
│   ├── review.validator.ts     # rating 1–5 integer, comment optional, max 2000 chars
│   └── address.validator.ts    # all required fields, country validation
│
├── utils/
│   ├── format.ts          # formatPrice(paisa), formatDate(isoString)
│   ├── slug.ts            # slugify(text)
│   ├── storage.ts         # uploadImage(file, folder), deleteStorageFile(pathOrUrl), isSupabaseStorageUrl()
│   ├── adapters.ts        # ALL mapX() anti-corruption layer functions
│   └── paisa.ts           # rupeesToPaisa(rupees), paisaToRupees(paisa) — EXTRACT these from ad-hoc parseFloat*100
│
├── constants/
│   ├── app.constants.ts       # STORE_NAME, DEFAULT_PAGE_LIMIT, TAX_RATE_PERCENT, API_BASE_URL
│   ├── order.constants.ts     # ORDER_STATUSES[], VALID_TRANSITIONS map, terminal states list
│   ├── shipping.constants.ts  # FALLBACK_SHIPPING_CHARGE_PAISA=15000, FALLBACK_FREE_THRESHOLD_PAISA=100000
│   ├── cart.constants.ts      # MAX_CART_ITEM_QTY=100, EMPTY_CART constant
│   ├── stock.constants.ts     # LOW_STOCK_THRESHOLD=5
│   └── states.constants.ts    # INDIAN_STATES array
│
├── hooks/                     # React-specific, business-logic-heavy
│   ├── useAuth.ts             # Wraps AuthContext
│   ├── useCart.ts             # Wraps CartContext with derived totals
│   ├── useSiteSettings.ts     # Wraps SiteSettingsContext with localStorage cache
│   ├── useDebounce.ts         # Generic debounce
│   └── useToast.ts            # Wraps ToastContext
│
└── state/                     # Framework-agnostic state machines
    ├── orderStateMachine.ts   # isValidTransition, isTerminalStatus, shiprocketStatusToOrderStatus
    └── cartCalculator.ts      # calculateShipping(subtotal, rules), calculateTotal(subtotal, discount, shipping)
```

### Phase 2 Notes

| Item | Action |
|------|--------|
| **Paisa arithmetic** | All monetary computations must remain integer paisa. Centralize `rupeesToPaisa` / `paisaToRupees` in `/lib/utils/paisa.ts` to eliminate scattered `parseFloat * 100` patterns. |
| **Order State Machine** | Must be shared or kept in exact parity between client and server (currently duplicated). Add unit tests to catch divergence. |
| **Low stock threshold** | Currently in two places (`StockBadge.tsx` and `InventoryList.tsx`). Centralize in `stock.constants.ts` as `LOW_STOCK_THRESHOLD = 5`. |
| **Shipping fallback values** | Hardcoded in `checkout/service.ts`. Centralize in `shipping.constants.ts`. |
| **Cart max qty** | Currently hardcoded as `100` in `cart/service.ts`. Centralize in `cart.constants.ts`. |
| **Navbar category limit** | Max 5 `showInNavbar` hardcoded in admin UI. Centralize as a named constant. |
| **Adapters ACL** | Retain `adapters.ts` as-is. This layer is what makes the rewrite safe — all raw API responses pipe through it. |
| **Event Bus** | Currently in-process only. For production scale with multiple Node instances, replace with Redis pub/sub or a proper message queue. |
| **Circuit Breaker** | Same limitation — not shared across processes. Consider integrating with Redis or a distributed state store. |
