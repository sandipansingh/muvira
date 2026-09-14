# Component patterns

## Data flow

- Route pages live in `client/src/pages/`; reusable UI lives in a feature directory under `client/src/components/`.
- API calls belong in `client/src/lib/services/` and use the shared API client for base URLs, JSON handling, and bearer tokens.
- Auth uses the shared Supabase client. Product, cart, checkout, order, profile, notification, and admin data flow through the Express API.
- Context providers own cross-route session, cart, toast, and site-settings state. Keep component-local state limited to local UI behavior.
- Never replace API errors or empty results with fabricated reviews, prices, promotions, inventory, categories, contact details, or success messages.
- Mutation promises must reject or return a checked failure result. Show success or navigate only after confirmation.

## Component placement

- `admin/` — admin authorization and operations shell
- `auth/` — sign-in, sign-up, and recovery components
- `cart/` — cart rows, drawer, and coupon controls
- `catalog/` — listings, filtering, product cards, and quick view
- `checkout/` — address, shipping, quote, and Razorpay handoff
- `common/` — shared composites such as breadcrumbs, pagination, modal, and toast
- `home/` — home-page sections
- `layout/` — storefront header, footer, menu, and announcement shell
- `product/` — product detail, gallery, and review presentation
- `ui/` — small reusable controls

Components rendered from a collection should be declared at module scope and keyed with stable database identifiers.

## Shared interaction patterns

- Use `Breadcrumbs` on multi-level storefront, customer-account, and admin pages.
- Use the animated `Dropdown` for sort, filter, and category selectors.
- Use the pill-style `Pagination` for paginated listings and preserve its scroll-to-results workaround.
- Use the shared modal, button, input, textarea, badge, and rating components before creating a new primitive.
- Use framer-motion for stateful transitions and presence animations. The CSS marquee utilities in `client/src/index.css` are an established exception.
- Loading states must explain that work is pending; error states must expose a retry or recovery route when possible.

## Commerce boundaries

- Totals displayed during checkout come from `POST /api/checkout/quote`.
- The checkout page may pass shipping, address, billing, coupon, and notes; it never passes an authoritative amount.
- Payment-instrument collection belongs exclusively to Razorpay Checkout.
- Order success pages fetch the owned order and verify its paid state.
- Wishlist, newsletter, returns, SMS, push, and Apple OAuth affordances stay absent until their backend/provider scope is approved.
