# Muvira Custom Checkout Implementation Plan

Implement the approved two-step checkout redesign with browser-only Razorpay Custom Checkout for cards, mobile UPI intent, desktop inline QR, netbanking and wallets.

## Tasks

1. Add durable, idempotent checkout preparation, owned active-session discovery and fenced reconciliation. Preserve the existing API response fields, captured-only finalization and retention policy. Cover provider uncertainty and concurrent/replayed requests.
2. Add typed CDN SDK loading, method discovery, transient card input validation and direct SDK submission. Render QR locally. Never put credentials in Muvira requests, storage, logs or telemetry.
3. Redesign delivery/billing and the payment workspace with one summary. Continue to payment does not reserve inventory. Review payment prepares an immutable order; a separate Pay action invokes the SDK synchronously. Reuse active orders and expose honest recovery states.
4. Add focused browser and database coverage, review the complete change, and run required verification in repository order.

## Decisions

- Account Custom Checkout and inline QR enablement were confirmed by the user.
- The user explicitly approved transient browser card entry as an exception to the previous repository policy. The server credential prohibition remains.
- Core four methods only; no UPI Collect, saved instruments, EMI, pay later or recurring payments.
- After preparation, changes require confirmed release; preserve 15-minute initial reservations and bounded 24-hour retention.
- Keep shipping/payment URLs and owned order outcome pages. Add a read-only payment config endpoint so method discovery requires no reservation.
- Poll visible QR sessions every five seconds until expiry; non-QR pending sessions for two minutes, then manual status checking. Pause hidden tabs, respect rate limits and coalesce provider checks.

## Verification

Exercise signatures, ownership, authoritative money, captured-only state, idempotency, replay, delayed capture, provider/persistence uncertainty, credential isolation, refresh recovery, SDK readiness, QR expiry and synchronous submission. Verify keyboard, mobile/desktop, enlarged text and reduced motion. Run lint:fix, format, build, type-check, test, graphify update in that order after fixes; also run local database and payment browser checks.
