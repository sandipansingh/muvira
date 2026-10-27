# Muvira interaction contract

Visual rules live in [DESIGN.md](DESIGN.md). Existing API authorization, payment, inventory and reconciliation behavior remains authoritative.

- Commerce and customer mutations go through existing services and the Express API. Money remains integer paisa; display uses Indian rupee formatting.
- Authentication and admin guards remain in place. Visual-test auth is isolated to a test Vite server; no production bypass exists.
- Save, cart and purchase actions retain their current promises, pending state, failure feedback and confirmed-success destinations. Provider outcomes are never inferred from UI state.
- Lists retain supported search, category, availability, price and sort parameters, explicit pagination, and scroll-to-results behavior. New filters are not invented.
- Shared Modal and useDialogFocus own Escape, focus trapping and restoration. Search uses this same modal. Mobile admin navigation uses the same primitive.
- Loading, error and empty states stay distinct. Optional campaigns/contact sections render only when configured. Content failures never introduce fallback commercial data.
- Checkout uses server totals and the existing Razorpay handoff. Payment verification, unknown/pending, confirmed success, released failure, tracking, invoice, refund and reconciliation actions preserve their existing state rules.
- Email preferences remain the only supported notification control. No wishlist, newsletter, subscriptions, SMS, push, Apple OAuth or returns are added.
- Existing native form validation is retained for this presentation migration. Dropdown is canonical for authored choices. Every field has a label, 16px minimum text and a visible focus state.
- Keyboard, touch, reduced motion, narrow layouts and enlarged text are verified in browser fixtures. Test fixtures block provider calls and reject unhandled mutations.

## Canonical UI map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | `ui/Dropdown`, `ui/Select` | Existing shared components and service contracts | Authored catalog/admin selectors; existing native address/state selectors retain platform keyboard and popup behavior | Responsive overlay suite |
| Form | Existing page handlers, shared Input/Textarea and server schemas | Existing shared components and service contracts | Existing native required/email validation remains enabled; server validation remains authoritative | Commerce browser regression tests |
| Scrollbar | `client/src/index.css` | Existing shared components and service contracts | Document and bounded overflow surfaces | Responsive route/overlay suites |
| Toast | ToastContext and common/Toast | Existing shared components and service contracts | Success, warning, info, error | Existing regression tests |
| CRUD | Services and existing page handlers | Existing shared components and service contracts | Confirmed success only; recovery retains current data | catalog-browser, refund-browser, fulfillment-browser tests |

The generic premium static auditor recommends disabling native validation. That recommendation is intentionally deferred here: disabling it without replacing every form's validation would weaken the existing commerce and account behavior. Likewise, existing resizable textareas remain available. This presentation migration preserves those controls and documents the decision instead of silently disabling validation or resizing.
