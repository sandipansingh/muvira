# Editorial redesign verification

Run `pnpm run test:responsive` from the repository root. The existing public route audit uses the configured local API and Vite client. Protected routes use an isolated test Vite server that imports the actual application, shared components, styles, and route guards.

Verified on 2026-10-27: all 936 browser cases passed. The public-route and dialog suites were rerun after their findings were fixed. The required lint, formatting, build, type-check, regression and graph-update sequence passed; regression results were 109 passed and 29 integration tests skipped. Graph generation completed with its optional SQL parser unavailable; no SQL changed in this redesign.

## Browser coverage

| Coverage | Cases |
| --- | ---: |
| Public routes, redirects and guest guards across 35 viewport/DPR/text settings | 735 |
| Public navigation, cart, search, filters, quick view and password recovery overlays | 22 |
| All 23 page components, shipping/payment and pending-payment views, plus content states across four widths | 136 |
| Protected editors, image removal, refunds, cancellation, reconciliation, address editing and gallery zoom | 43 |

The authenticated matrix uses 390px mobile, 820px tablet, 1440px desktop and 320px with 200% text. It checks document overflow, headings, minimum field text size, runtime errors and unexpected provider requests. Dialog coverage also checks keyboard containment and Escape focus restoration. The public matrix additionally checks touch targets, clipping, text sizes, image dimensions and sticky overlaps. Checkbox and radio hit targets include their actual clickable labels.

Loading, request failure, empty results, missing images, long product names, unconfigured hero content and optional campaigns have separate screenshots. These fixtures do not replace guest-access checks.

## Fixtures and artifacts

`tests/fixtures/editorial-catalog.json` contains a snapshot of public Muvira catalog photography and content. Contact details are sanitized. Account, address, order and operational records are synthetic. `editorial-server.mjs` substitutes services only within the isolated test server; production authentication and authorization are unchanged. Unhandled API calls and consequential mutations reject, and external provider traffic is blocked.

Public screenshots and reports are written to `responsive-audit/after/`. Authenticated screenshots, content states and protected overlays are written to `responsive-audit/redesign/`. Generated output is ignored by Git apart from the repository's existing selected public screenshots.

The regression suite covers existing cart, stock, quote, payment recovery, review, catalog, fulfillment, refund and reconciliation behavior. The redesign adds regressions for manual hero navigation, search focus, loading-grid reflow, unavailable stock, protected access, pending-payment presentation, coupon failure recovery and selling-price presentation.

Provider-backed integration tests remain opt-in. Visual fixtures establish UI behavior and layout; they do not establish live payment, shipping, refund or email outcomes.

Runtime design tokens and typography are documented in `DESIGN_SYSTEM.md` and `DESIGN.md`. The retained native validation and textarea-resizing decisions are documented in `UX-CONTRACT.md`.

## Configured content

Hero titles, subtitles and destinations remain owned by Store settings. Two existing hero destinations use legacy category slugs (`solid-wood-furniture` and `kurtas-apparel`) that are absent from the current catalog. Their stored values were retained; they can be revised in the redesigned content editor. The unconfigured hero links to the working `/shop` destination.
