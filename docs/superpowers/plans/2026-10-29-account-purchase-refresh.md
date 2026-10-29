# Account and purchase refresh implementation plan

> Execute with superpowers:executing-plans. The approved conversation plan is the design specification.

**Goal:** Rebuild account, cart, checkout, outcomes and tracking using the six supplied references and existing Muvira tokens.

**Architecture:** Shared account shell and order presentation components; existing checkout services and payment state machine remain authoritative. Add only the authenticated `/orders/:id/tracking` route.

**Constraints:** Preserve native validation, 16px fields, shared controls, user-keyed account drafts, paisa boundaries, provider credential isolation and confirmed outcomes. No API/database changes or reference-only product features.

## Tasks

- [x] Add regression coverage for authenticated tracking, state failures/races and navigation; observe failure before implementation.
- [x] Build the account sidebar shell and refresh overview, personal/address and order-history views.
- [x] Refresh cart and shared coupon/summary layout; refresh shipping and expandable payment panels while preserving orchestration.
- [x] Build shared order presentation, tracking and redesigned confirmation/detail/outcome screens.
- [x] Extend responsive fixtures; verify Chromium/WebKit at 320/390/768/1280/1440px and 200% text, long content, unavailable images and keyboard interaction.
- [x] Update DESIGN.md and UX-CONTRACT.md. Run lint:fix, format, build, type-check, pnpm test, graphify update . in order; run complete responsive suite and frozen-code visual review.
- [x] Obtain fresh branch review, fix important findings, record evidence and commit the verified result.

## Review focus

Tracking must never imply normal progress for exceptional states or invent dates. Tracking failure must not hide owned order data. Identity/order changes must suppress obsolete results. Payment panel changes must clear card credentials and preserve pending-state locks. Responsive navigation and summaries must remain reachable at enlarged text sizes.
