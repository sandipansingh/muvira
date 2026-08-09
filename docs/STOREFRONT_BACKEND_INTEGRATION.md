# Storefront Backend Integration

## Approved design

The customer storefront remains a Vite + React application with its existing
routes and visual design. Customer commerce data is read from the existing REST
API under `/api`; Supabase remains the authentication provider and its access
token is sent as a bearer token for authenticated requests.

The browser uses `VITE_API_URL` as the API origin. When that variable is empty,
the client uses relative `/api` URLs so the Vite development proxy can forward
requests to the local backend. The API client owns response parsing, normalized
network and HTTP errors, and session cleanup after a 401 response.

Global commerce state has one source per concern:

- `AuthContext` owns the Supabase session and backend profile.
- `CartContext` owns server cart state for authenticated users and local guest
  cart state until authentication.
- `SiteSettingsContext` owns API-backed site settings and loading/error state.

Guest cart items are merged once after login. Items that fail to merge remain
in local storage so a stock or product error cannot silently discard customer
work.

The backend is authoritative for product prices, cart quantities, coupon
discounts, shipping, tax, and order totals. The current backend tax amount is
zero, so the client does not display a fabricated GST line. Razorpay order
creation and payment verification use the checkout and payment API routes; the
success and failure views receive real order/payment results.

Testimonials remain static marketing content because they are not part of the
customer commerce API. Product reviews, however, come from the public reviews
endpoint and authenticated submissions send only `rating` and `comment`; the
server controls reviewer identity and purchase eligibility.

## Decision log

| Decision | Rationale |
| --- | --- |
| Use `VITE_API_URL` with relative `/api` fallback | Supports deployed API origins and the existing Vite proxy without environment-specific service code. |
| Preserve Supabase auth | The backend validates Supabase bearer tokens and the existing sign-in/sign-up flow already uses that provider. |
| Keep server cart for authenticated users | Cart contents, product availability, and checkout prices must come from backend state. |
| Merge guest cart once after login and retain failures | Customers should not lose locally added items when a product is unavailable or a network request fails. |
| Treat checkout response totals as authoritative | Prevents client-side price, discount, shipping, and tax drift or tampering. |
| Keep testimonials as static fallback content | Testimonials are marketing content and have no customer-facing API route. |
| No new routes or schema changes | All requested storefront capabilities are covered by the existing React routes and backend endpoints. |
