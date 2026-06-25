# Muvira API Contracts — Frontend Integration Guide

> For the frontend team. This document describes every endpoint the backend exposes: method, path, auth requirement, request shape, response shape, and possible errors. No backend implementation details — just the contract.

---

## 0. Base Setup

**Base URL:** `https://api.muvira.com` (or your configured `API_BASE_URL` per environment)

**Auth header (for all authenticated routes):**
```
Authorization: Bearer <supabase_access_token>
```
The frontend gets this token directly from the **Supabase Auth client SDK** (signup/login/logout/session refresh are handled client-side via Supabase, not via this API). This backend only verifies the token on incoming requests — there are no `/auth/signup` or `/auth/login` endpoints on this API.

**Content type:** `application/json` for all requests/responses unless noted (image upload is `multipart/form-data`).

**All money values are integers in paisa.** ₹499.50 → `49950`. Always divide by 100 and format with `₹` in the UI; never send/receive rupee floats.

**Pagination pattern** (used wherever noted):
```
GET /api/products?page=1&limit=20
```
Response includes:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 134,
    "totalPages": 7
  }
}
```

---

## 1. Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input.",
    "fieldErrors": {
      "email": ["Invalid email address"]
    }
  }
}
```
`fieldErrors` is only present on `400` validation failures.

### Common HTTP Status Codes
| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET/PATCH/action |
| `201` | Created | Successful POST that creates a resource |
| `400` | Bad Request | Validation failed (see `fieldErrors`) |
| `401` | Unauthorized | Missing/invalid/expired token |
| `403` | Forbidden | Authenticated, but not allowed (e.g. not your resource, not admin) |
| `404` | Not Found | Resource doesn't exist (or isn't yours — see note below) |
| `409` | Conflict | e.g. duplicate coupon code, out-of-stock at checkout |
| `429` | Too Many Requests | Rate limited |
| `500` | Server Error | Unexpected; show a generic "something went wrong" |

> **Note for frontend:** when a user tries to access another user's resource (e.g. someone else's order), the API returns `404`, not `403` — this avoids leaking whether the resource exists. Treat `404` on detail pages as "not found," not as a special "forbidden" state.

---

## 2. Public Endpoints (no auth required)

### `GET /api/health`
Health check.
```json
// 200
{ "success": true, "data": { "status": "ok" } }
```

---

### `GET /api/products`
List/search/filter products.

**Query params (all optional):**
| Param | Type | Notes |
|---|---|---|
| `page` | number | default `1` |
| `limit` | number | default `20`, max `100` |
| `q` | string | full-text search |
| `category` | string | category slug |
| `minPrice` | number | paisa |
| `maxPrice` | number | paisa |
| `inStock` | boolean | `true` to exclude out-of-stock |
| `sort` | enum | `price_asc` \| `price_desc` \| `newest` \| `popularity` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cotton Kurta",
      "slug": "cotton-kurta",
      "shortDescription": "Soft handloom cotton kurta",
      "price": 149900,
      "salePrice": 119900,
      "discountPercent": 20,
      "stock": 42,
      "inStock": true,
      "isFeatured": false,
      "categoryId": "uuid",
      "categoryName": "Kurtas",
      "primaryImageUrl": "https://...",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```
`salePrice` is `null` when no discount is active. `discountPercent` is precomputed for display convenience.

---

### `GET /api/products/:slug`
Product detail.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Cotton Kurta",
    "slug": "cotton-kurta",
    "description": "Full long-form description...",
    "shortDescription": "Soft handloom cotton kurta",
    "price": 149900,
    "salePrice": 119900,
    "discountPercent": 20,
    "stock": 42,
    "inStock": true,
    "sku": "MUV-KUR-001",
    "isFeatured": false,
    "isActive": true,
    "category": { "id": "uuid", "name": "Kurtas", "slug": "kurtas" },
    "images": [
      { "id": "uuid", "url": "https://...", "altText": "Front view", "isPrimary": true, "sortOrder": 0 },
      { "id": "uuid", "url": "https://...", "altText": "Back view", "isPrimary": false, "sortOrder": 1 }
    ],
    "metadata": { "color": "Blue", "size": "M" },
    "createdAt": "2026-05-01T10:00:00Z"
  }
}
```
**`404`** if slug doesn't exist or product is inactive.

---

### `GET /api/products/:id/related`
**Response `200`:** same shape as the list array in `GET /api/products` (no pagination wrapper, capped at ~8 items).

---

### `GET /api/categories`
**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Kurtas", "slug": "kurtas", "description": "...", "imageUrl": "https://...", "sortOrder": 0 }
  ]
}
```

### `GET /api/categories/:slug`
Same single-object shape as above. `404` if not found/inactive.

---

### `GET /api/campaigns/active`
For homepage sale banners.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Diwali Sale",
      "slug": "diwali-sale",
      "description": "Up to 30% off",
      "bannerImageUrl": "https://...",
      "discountType": "percentage",
      "discountValue": 30,
      "startDate": "2026-10-15T00:00:00Z",
      "endDate": "2026-11-05T23:59:59Z"
    }
  ]
}
```

---

## 3. Authenticated Endpoints (user)

All require `Authorization: Bearer <token>`. `401` if missing/invalid.

### `GET /api/profile`
```json
// 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Asha Roy",
    "phone": "+919876543210",
    "role": "user",
    "createdAt": "2026-01-10T00:00:00Z"
  }
}
```

### `PATCH /api/profile`
**Request:**
```json
{ "fullName": "Asha Roy", "phone": "+919876543210" }
```
**Response `200`:** updated profile object (same shape as GET).
**`400`** on validation failure (e.g. malformed phone).

---

### `GET /api/addresses`
```json
// 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "label": "home",
      "fullName": "Asha Roy",
      "phone": "+919876543210",
      "line1": "12 Park Street",
      "line2": "Flat 4B",
      "city": "Kolkata",
      "state": "West Bengal",
      "pincode": "700016",
      "country": "India",
      "isDefault": true
    }
  ]
}
```

### `POST /api/addresses`
**Request:**
```json
{
  "label": "home",
  "fullName": "Asha Roy",
  "phone": "+919876543210",
  "line1": "12 Park Street",
  "line2": "Flat 4B",
  "city": "Kolkata",
  "state": "West Bengal",
  "pincode": "700016",
  "isDefault": false
}
```
**Response `201`:** the created address object. **`400`** on validation error.

### `PATCH /api/addresses/:id`
Same body shape as POST (partial allowed). **`200`** on success. **`404`** if not found or not owned by caller.

### `DELETE /api/addresses/:id`
**`200`** `{ "success": true, "data": { "deleted": true } }`. **`404`** if not found/not owned.

### `POST /api/addresses/:id/default`
Sets this address as default (unsets others). **`200`** with updated address. **`404`** if not found/not owned.

---

### `GET /api/cart`
```json
// 200
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Cotton Kurta",
        "productSlug": "cotton-kurta",
        "productImage": "https://...",
        "unitPrice": 119900,
        "quantity": 2,
        "lineTotal": 239800,
        "inStock": true,
        "availableStock": 42
      }
    ],
    "subtotal": 239800,
    "itemCount": 2
  }
}
```
`unitPrice` reflects current sale price live (cart total is **not** locked until checkout — actual charged amount is always recomputed server-side at order creation).

### `POST /api/cart`
**Request:**
```json
{ "productId": "uuid", "quantity": 1 }
```
**Response `201`:** the created/updated cart item. **`409`** if requested quantity exceeds available stock. **`404`** if product doesn't exist or is inactive.

### `PATCH /api/cart/:itemId`
**Request:**
```json
{ "quantity": 3 }
```
**`200`** on success, **`404`** if item not found/not owned, **`409`** if quantity exceeds stock.

### `DELETE /api/cart/:itemId`
**`200`** `{ "success": true, "data": { "deleted": true } }`. **`404`** if not found/not owned.

---

### `POST /api/checkout/apply-coupon`
**Request:**
```json
{ "code": "DIWALI20" }
```
**Response `200`:**
```json
{
  "success": true,
  "data": {
    "code": "DIWALI20",
    "discountType": "percentage",
    "discountValue": 20,
    "discountAmount": 47960,
    "newSubtotal": 191840
  }
}
```
**Errors:**
- `404` — coupon code doesn't exist.
- `409` `INVALID_COUPON` — expired, inactive, usage limit reached, or cart subtotal below `min_order_amount` (message explains which).

> Note: this is a **preview** computation against the current cart for UI display. The authoritative discount is recalculated again at `create-order` — frontend should not assume this locks the price.

### `POST /api/checkout/remove-coupon`
**Response `200`:** `{ "success": true, "data": { "removed": true } }`

---

### `POST /api/checkout/create-order`
Creates a pending order and a Razorpay order. Call this when the user taps "Pay Now."

**Request:**
```json
{
  "addressId": "uuid",
  "couponCode": "DIWALI20",
  "carrierNote": null
}
```
`couponCode` optional (omit or `null` if none applied).

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "MUV-000123",
    "razorpayOrderId": "order_xxxxxxxxxxxx",
    "razorpayKeyId": "rzp_live_xxxxxxxxxxxx",
    "amount": 191840,
    "currency": "INR",
    "subtotal": 239800,
    "discountAmount": 47960,
    "shippingAmount": 0,
    "totalAmount": 191840
  }
}
```
Use `razorpayOrderId`, `razorpayKeyId`, and `amount` to open **Razorpay Checkout** on the client (per Razorpay's standard web/mobile checkout SDK — this API does not provide that UI). `razorpayKeyId` is the **public** key id, safe to use client-side.

**Errors:**
- `400` — missing/invalid `addressId`.
- `404` — address not found / not owned by caller.
- `409` `EMPTY_CART` — cart has no items.
- `409` `OUT_OF_STOCK` — one or more cart items no longer have sufficient stock; response includes which `productId`s.
- `409` `INVALID_COUPON` — coupon became invalid between preview and order creation.

```json
// 409 example
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Some items in your cart are no longer available in the requested quantity.",
    "details": [
      { "productId": "uuid", "productName": "Cotton Kurta", "availableStock": 1, "requestedQuantity": 2 }
    ]
  }
}
```

---

### `POST /api/payments/verify`
Call this **after** Razorpay Checkout completes on the client and returns its response object.

**Request:**
```json
{
  "razorpayOrderId": "order_xxxxxxxxxxxx",
  "razorpayPaymentId": "pay_xxxxxxxxxxxx",
  "razorpaySignature": "generated_signature_string"
}
```

**Response `200` (success):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "orderId": "uuid",
    "orderNumber": "MUV-000123",
    "status": "confirmed",
    "paymentStatus": "paid"
  }
}
```

**Response `400` (signature mismatch / verification failed):**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_VERIFICATION_FAILED",
    "message": "We couldn't verify this payment. If money was deducted, it will be refunded automatically or please contact support."
  }
}
```

> **Frontend behavior note:** Always show the user a clear failure/retry screen on this error — never assume payment success client-side from the Razorpay modal closing without errors. This endpoint's response is the only source of truth for "did the payment actually go through." It's also safe to call this endpoint more than once with the same data (e.g. on a retry after a flaky network call) — it returns the same success response idempotently rather than erroring.

---

### `GET /api/orders`
Order history, paginated.

**Query params:** `page`, `limit` (same defaults as products).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderNumber": "MUV-000123",
      "status": "confirmed",
      "paymentStatus": "paid",
      "fulfillmentStatus": "unfulfilled",
      "totalAmount": 191840,
      "itemCount": 2,
      "createdAt": "2026-06-10T14:22:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### `GET /api/orders/:id`
Full order detail. **`404`** if not found or not owned by caller (see note in Section 1).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "MUV-000123",
    "status": "confirmed",
    "paymentStatus": "paid",
    "fulfillmentStatus": "unfulfilled",
    "subtotal": 239800,
    "discountAmount": 47960,
    "shippingAmount": 0,
    "totalAmount": 191840,
    "couponCode": "DIWALI20",
    "shippingAddress": {
      "fullName": "Asha Roy",
      "phone": "+919876543210",
      "line1": "12 Park Street",
      "line2": "Flat 4B",
      "city": "Kolkata",
      "state": "West Bengal",
      "pincode": "700016",
      "country": "India"
    },
    "carrierName": null,
    "trackingId": null,
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Cotton Kurta",
        "productImage": "https://...",
        "unitPrice": 119900,
        "quantity": 2,
        "totalPrice": 239800
      }
    ],
    "createdAt": "2026-06-10T14:22:00Z",
    "updatedAt": "2026-06-10T14:25:00Z"
  }
}
```

**Status enums (for UI badges):**
| Field | Values |
|---|---|
| `status` | `pending` \| `confirmed` \| `processing` \| `shipped` \| `delivered` \| `cancelled` |
| `paymentStatus` | `pending` \| `paid` \| `failed` \| `refunded` |
| `fulfillmentStatus` | `unfulfilled` \| `partial` \| `fulfilled` |

---

## 4. Admin Endpoints

All require `Authorization: Bearer <token>` **and** the caller's profile must have `role: "admin"`. Non-admins get `403`:
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Admin access required." } }
```

### Products

`GET /api/admin/products` — paginated list, includes inactive products. Query: `page`, `limit`, `q`, `category`, `isActive`.

`POST /api/admin/products`
```json
// Request
{
  "name": "Cotton Kurta",
  "categoryId": "uuid",
  "description": "Full description",
  "shortDescription": "Soft handloom cotton",
  "price": 149900,
  "salePrice": 119900,
  "stock": 50,
  "sku": "MUV-KUR-001",
  "isFeatured": false,
  "isActive": true,
  "metadata": { "color": "Blue", "size": "M" }
}
```
`201` with created product (full detail shape, same as `GET /api/products/:slug`). `slug` is auto-generated server-side from `name`.

`PATCH /api/admin/products/:id` — same body, partial. `200` updated product. `404` if not found.

`DELETE /api/admin/products/:id` — soft delete (`isActive=false`). `200` `{ "deleted": true }`.

`POST /api/admin/products/:id/images` — `multipart/form-data`, field name `images` (multiple files allowed).
```json
// 201
{
  "success": true,
  "data": [
    { "id": "uuid", "url": "https://...", "sortOrder": 2, "isPrimary": false }
  ]
}
```

`DELETE /api/admin/products/:id/images/:imageId` — `200` `{ "deleted": true }`.

`PATCH /api/admin/products/:id/images/reorder`
```json
{ "imageOrder": ["uuid1", "uuid2", "uuid3"] }
```
`200` with reordered image list.

### Categories

`GET /api/admin/categories`, `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`

```json
// POST/PATCH request
{ "name": "Kurtas", "description": "...", "imageUrl": "https://...", "sortOrder": 0, "isActive": true }
```
`DELETE` returns `409 CATEGORY_HAS_PRODUCTS` if products still reference it.

### Coupons

`GET /api/admin/coupons` — paginated.

`POST /api/admin/coupons`
```json
{
  "code": "DIWALI20",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 50000,
  "maxDiscountAmount": 100000,
  "usageLimit": 500,
  "validFrom": "2026-10-15T00:00:00Z",
  "validUntil": "2026-11-05T23:59:59Z"
}
```
`201` with created coupon. `409 DUPLICATE_CODE` if code already exists (codes are case-insensitive, stored uppercase).

`PATCH /api/admin/coupons/:id` — same shape, partial. `200`.

`POST /api/admin/coupons/:id/deactivate` — `200` `{ "isActive": false }`.

### Campaigns

`GET /api/admin/campaigns`, `POST /api/admin/campaigns`, `PATCH /api/admin/campaigns/:id`

```json
{
  "name": "Diwali Sale",
  "description": "...",
  "bannerImageUrl": "https://...",
  "discountType": "percentage",
  "discountValue": 30,
  "productIds": ["uuid1", "uuid2"],
  "categoryIds": [],
  "applyToAll": false,
  "startDate": "2026-10-15T00:00:00Z",
  "endDate": "2026-11-05T23:59:59Z",
  "isActive": true
}
```

`POST /api/admin/campaigns/:id/toggle` — `200` `{ "isActive": true }`.

### Orders (admin)

`GET /api/admin/orders` — paginated, **all** users' orders. Query: `page`, `limit`, `status`, `paymentStatus`, `fulfillmentStatus`, `q` (search by order number, customer name/phone).

`GET /api/admin/orders/:id` — same detail shape as customer `GET /api/orders/:id`, plus customer contact info:
```json
{
  // ...same fields as customer order detail...
  "customer": { "id": "uuid", "fullName": "Asha Roy", "phone": "+919876543210", "email": "asha@example.com" },
  "adminNotes": [
    { "id": "uuid", "note": "Customer requested gift wrap", "createdAt": "2026-06-10T15:00:00Z", "createdBy": "Admin Name" }
  ]
}
```

`PATCH /api/admin/orders/:id/status`
```json
{ "status": "shipped" }
```
`200` updated order.

`PATCH /api/admin/orders/:id/fulfillment`
```json
{ "fulfillmentStatus": "fulfilled", "carrierName": "Bluedart", "trackingId": "BD123456789IN" }
```
`carrierName`/`trackingId` are **free-text fields** — no carrier API integration, just stored and displayed. `200` updated order.

`POST /api/admin/orders/:id/notes`
```json
{ "note": "Customer requested gift wrap" }
```
`201` with the created note.

### Dashboard & Inventory

`GET /api/admin/dashboard/stats`
```json
{
  "success": true,
  "data": {
    "totalOrders": 312,
    "totalRevenue": 4582000,
    "totalProducts": 134,
    "totalCategories": 12,
    "activeCoupons": 3,
    "lowStockCount": 7
  }
}
```

`GET /api/admin/inventory` — paginated product stock list. Query: `lowStockOnly` (boolean), `page`, `limit`.
```json
{
  "success": true,
  "data": [
    { "productId": "uuid", "productName": "Cotton Kurta", "sku": "MUV-KUR-001", "stock": 3, "isLowStock": true }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```
"Low stock" threshold is server-defined (currently stock ≤ 5) — flagged via `isLowStock`, no need for frontend to compute it.

---

## 5. Razorpay Checkout Integration Notes (frontend-facing)

This is the one place frontend talks to a third party directly (Razorpay's own Checkout SDK), so it's worth spelling out the flow end-to-end:

1. User taps "Pay Now" → call `POST /api/checkout/create-order`.
2. Use the response (`razorpayOrderId`, `razorpayKeyId`, `amount`, `currency`) to open Razorpay's Checkout (web: `Razorpay` JS SDK; mobile: native SDK), prefilling name/phone/email from the user's profile if desired.
3. On Razorpay Checkout success callback, you receive `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` — send these **exactly as received** to `POST /api/payments/verify`.
4. Only treat the order as paid when `/api/payments/verify` returns `200` with `verified: true`. **Do not** treat Razorpay's client-side success callback alone as proof of payment — always wait for this server confirmation before showing an order-success screen.
5. On Razorpay Checkout's own failure/cancel callback (user closed the modal, card declined, etc.), do not call `/verify` — just route the user to a "payment not completed" screen and let them retry (retrying calls `create-order` again, which is safe to do multiple times for the same cart).
6. If the app crashes or loses connectivity between step 3 and step 4 (verify never gets called), the order may still complete via the backend webhook a few seconds later. If you need to handle this, poll `GET /api/orders/:id` after a short delay rather than assuming failure.

---

## 6. Error Codes Reference

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/query failed schema validation — see `fieldErrors` |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Not allowed (e.g. non-admin hitting admin route) |
| `NOT_FOUND` | 404 | Resource doesn't exist or isn't yours |
| `OUT_OF_STOCK` | 409 | Requested quantity exceeds available stock |
| `EMPTY_CART` | 409 | Tried to checkout with no cart items |
| `INVALID_COUPON` | 409 | Coupon expired/inactive/limit reached/min order not met |
| `DUPLICATE_CODE` | 409 | Coupon code already exists |
| `CATEGORY_HAS_PRODUCTS` | 409 | Can't delete a category still in use |
| `PAYMENT_VERIFICATION_FAILED` | 400 | Razorpay signature didn't match |
| `RATE_LIMITED` | 429 | Too many requests, retry later |
| `SERVER_ERROR` | 500 | Unexpected error, show generic message |

---

## 7. Field Naming & Conventions for Frontend

- All response fields are **camelCase** (even though the database uses snake_case).
- All monetary fields end in `Amount` or `Price` and are **integer paisa** — divide by 100 for display.
- All dates are **ISO 8601 UTC strings** (`2026-06-10T14:22:00Z`) — format/timezone-convert client-side.
- All list endpoints that support pagination use the same `{ data: [...], pagination: {...} }` envelope.
- IDs are UUID strings throughout.
