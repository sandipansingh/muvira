# Sign-in popups and reduced arrows Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks in order.

**Goal:** Keep shoppers on their page while authenticating and remove customer-facing decorative arrows.

**Architecture:** A shared AuthDialogProvider owns openAuth({ mode, returnTo? }) and closeAuth(), with one Modal and in-dialog sign-in, signup, recovery and confirmation views. Guards replace unauthorized destinations with a safe background and typed auth navigation state; only a confirmed profile allows continuation. Existing Supabase methods and Express contracts remain authoritative.

**Tech Stack:** React 19, React Router 7, TypeScript, existing shared Modal/Input/Button, Playwright browser fixtures.

**Spec:** User's “Sign-in popups and reduced arrow usage” request, 2026-10-28.

## Global Constraints

- No provider, API or database changes; retain backend admin authorization.
- Reuse tokens, DM Serif Display headings, Manrope controls, unframed logo, 16px fields and 44px targets.
- Preserve URL/search/hash, scroll and cart when opening, switching or dismissing authentication.
- Never complete a dismissed dialog or duplicate Buy now's confirmed cart addition.
- Keep reset-password recovery links and functional navigation icons.

## Review Focus

- Encoded/external/auth-entry return paths must not escape the storefront or loop.
- Dismissal and reopening during delayed credentials/profile requests must not consume stale completion.
- Mobile/cart opener removal must restore a visible persistent control.
- Confirmation-required signup must never imply an authenticated profile.
- Direct protected access must not mount customer/admin content before authorization.

## Task 1: Authentication popup milestone

**Files:** Add context/AuthDialogContext.tsx, components/auth/AuthDialog.tsx, components/auth/AuthEntry.tsx, shared auth types and deterministic browser fixtures/tests. Update App, guards, header/menu/footer, cart/drawer, ProductInfo, reset-password and competing redirects. Update auth screenshot/responsive fixtures and design/interaction documentation.

**Interfaces:** openAuth({ mode: 'signin' | 'signup', returnTo?: string }): void; closeAuth(): void. Keep login/signup contracts; continuation requires user and completed profile loading.

- [x] Add deterministic tests and observe failure for popup entry, credentials, delayed/failing profile, confirmation, recovery, switching, stale completion, safe routing, focus and cart continuity.
- [x] Implement shared controller/form and guarded compatibility/protected routing.
- [x] Integrate every entry point and preserve Buy now addition/quantity.
- [x] Update fixtures/docs, exercise mobile, enlarged text and reduced motion, review screenshots.
- [x] Run lint:fix, format, build, type-check, test, graphify update in that order; commit feat(auth): keep shoppers in a shared authentication popup.

## Task 2: Arrow cleanup milestone

**Files:** Customer home/discovery/collection links, Header/Footer, empty/outcome/checkout buttons, QuickViewModal, order cards and obsolete index.css icon selectors. Keep admin and functional navigation controls.

- [x] Add browser assertions for text-only links, visible View order and retained gallery/carousel/disclosure/back controls.
- [x] Remove decorative arrow markup/imports, simplify obsolete spacing/CSS and retain search's visible label on mobile.
- [x] Update design and interaction conventions and visually review customer surfaces.
- [x] Run lint:fix, format, build, type-check, test, graphify update in order, then responsive suite; commit style(storefront): remove decorative navigation arrows.
- [x] Obtain independent code review and fix Important findings with browser regressions.

Release procedure: Push the verified revision to the existing deploy branch for Dokploy. Verify container health, revision and live guest popup behavior; production evidence is reported in the delivery message.

## Execution record

- Recon: Existing guards redirect to standalone auth pages, drop hashes, and compete with four page-level redirects. Login returns before profile hydration. Shared Modal/useDialogFocus own focus trapping and body scroll locking.
- Decision: Use the current checkout on a dedicated feature branch to keep existing installed dependencies and fixture paths usable. The detailed user spec supplies the product/design choices.
- Release: README documents Dokploy builds; investigate connected UI/access after the release candidate passes verification.
