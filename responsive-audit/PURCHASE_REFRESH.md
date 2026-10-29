# Account and purchase redesign verification

The six supplied references in `design-references/` guide the new account sidebar, cart rows and summary modules, shipping/payment workspace, two-column confirmation, shipment progress and event timeline. Muvira's runtime colours, typography, logo and footer remain authoritative.

## Delivered screens

- Profile overview, personal information/preferences and saved addresses.
- Order history and order details with their shared account shell.
- Shopping bag, shipping details and expanded payment-method panels.
- Verified confirmation, matching pending/failure presentation and authenticated `/orders/:id/tracking`.

The tracking view uses existing owned-order and carrier APIs. Normal progress follows authoritative order status; exceptions do not claim delivery. Events retain real timestamps labelled IST. Missing carrier data and unavailable estimates do not produce invented events, dates or products.

## Verification record

- Full regression suite: 545 tests, 497 passed, 48 skipped, zero failures. Focused account/checkout tests also passed in Chromium and WebKit.
- Expanded payment choices retain card clearing, preparation/pay separation, pending locks and keyboard/pointer bank selection.
- Required checks passed in order: lint:fix, format, build, type-check, pnpm test, graphify update . All six responsive groups passed across 1,372 cases, as recorded below.
- Graph update rebuilt 2,913 nodes and 6,808 edges. Its existing optional SQL-parser warning remains; this change contains no SQL.
- Independent source review: no Critical, Important or Minor findings.
- Static premium audit: baseline 36 findings; final 35; no new findings. The remaining 24 native-validation and 11 textarea-resize findings are existing exceptions explicitly preserved in UX-CONTRACT.md. The strict command returns 1 for those exceptions.
- DESIGN.md lint: zero errors; one warning because the existing document uses prose rather than YAML tokens. Runtime CSS remains the token owner.

## Browser evidence

`tests/fixtures/journey-audit.mjs` captures 240 views: 12 customer destinations × five widths (320, 390, 768, 1280, 1440) × normal/200% text × Chromium/WebKit. Enlarged-text cases include long content and unavailable product images. The audit checks document overflow, control bounds, field sizes, one page heading and account-navigation focus.

Raw captures and JSON are local evidence in ignored `responsive-audit/redesign/journey/`. Additional enabled-method, card and live-QR fixture captures are in ignored `dev-scripts/journey-payments/`; these never contact a live payment provider. Representative real-photography previews are in `dev-scripts/journey-*.png`.

## Intentional system changes

| Existing composition | New composition |
| --- | --- |
| Horizontal account links and oversized shortcut row | Shared identity/navigation rail and compact account overview |
| Duplicate cart product previews in summary | One product list with independent coupon/price cards |
| Grid payment-method selector | Stacked selected-method panels using the existing payment controller |
| Centred confirmation panel | Order facts beside items and complete totals |
| Tracking embedded in details | Dedicated owned tracking page and compact detail recap |

No API, database, provider workflow, payment credential boundary or unsupported product feature was added.

## Final responsive results

| Group | Cases | Result |
| --- | ---: | --- |
| Storefront viewport/DPR/text matrix | 735 | Passed |
| Storefront overlays | 22 | Passed |
| Authenticated customer/admin views | 240 | Passed |
| Protected editors and confirmations | 78 | Passed |
| Heritage/navigation/gallery/purchase interactions | 57 | Passed |
| Chromium/WebKit account and purchase matrix | 240 | Passed |
| **Total** | **1,372** | **Passed** |

The final `pnpm run test:responsive --fully-parallel --workers=3` invocation passed the storefront, overlay and new journey groups. Three image-dependent groups stopped on Supabase connection timeouts (`UND_ERR_CONNECT_TIMEOUT`); they then passed unchanged under a serial retry of those three groups with `--workers=1`. No product code changed between those runs. Logs remain in ignored `dev-scripts/journey-responsive*.log`.

The final frozen client-source fingerprint is `043745a05312e8a96ac860f791a54edc395c6a0fb61a8565967f499fc8df30fc`. Independent review found no actionable issues, including the final field-aligned bank/wallet popups. Both popup choices were exercised at 1280px and at 320px/200% text in Chromium and WebKit. The expiry field's complete short value remains readable at enlarged text; a restored payment never displays a later mutable bag coupon.

Seven tracked legacy audit images were restored to their repository baseline after their regenerated copies were preserved in ignored `dev-scripts/journey-final-tracked-captures/`. The new 240-view journey evidence remains in its dedicated ignored directory.
