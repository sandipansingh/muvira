# Original Muvira theme restoration

Date: 2026-10-29. Starting commit: `bc4301b`; palette/font reference: `247791a`.

## Scope

Restored cream canvas/header, white panels, warm subtle surfaces, stone footer, forest-green actions/selected states, brass decoration and the original semantic success/information colours. Local Manrope owns body, controls, product titles and prices; DM Serif Display owns editorial/page/panel headings at regular 400 with synthesis disabled. Both local fonts are preloaded; unused Inter files and declarations are removed.

Current type sizes, line heights, spacing, radii, shadows, composition and controls remain intact. No application TSX, API, route, backend, database or business behavior was changed. Administration retains its independently scoped palette, Manrope weights and geometry.

## Visual comparison

Rendered an archived checkout of `247791a` with the isolated browser fixture and compared it with the restored storefront at 1440px. Local, ignored evidence lives under `dev-scripts/theme-restoration/`. Payment comparisons use existing prior-theme fixture captures under `dev-scripts/journey-payments/`.

| Surface | Reviewed result | Comparison board |
| --- | --- | --- |
| Home | Original palette/font roles with the current 40px hero, 24px sections, photographs, mosaic and merchandise composition | `comparisons/home.png` |
| Collection | Cream canvas, forest selections/prices and regular serif title; current filter rail, shortcuts and product grid | `comparisons/collection.png` |
| Product | Manrope product title/prices, regular serif editorial sections; current gallery and purchase controls | `comparisons/product.png` |
| Account | Cream shell, pale-green selected navigation and regular 18px panels; current identity above the 200px rail | `comparisons/profile.png` |
| Cart | Forest checkout action, current 80px images, aligned minus/value/plus, authoritative totals and 3:2 columns | `comparisons/cart.png` |
| Shipping | Warm canvas, white panels and forest selections; current field order, billing disclosure and single primary action | `comparisons/shipping.png` |
| Card payment | Regular serif panels, Manrope fields and forest selected state; genuine network colours and existing number/expiry/security/name order | `comparisons/card.png` |
| UPI | Compact expanded method and existing state/recovery controls; white QR quiet zone and genuine payment artwork | `comparisons/upi.png` |
| Confirmation | Cream/white surfaces and green verified state; current equal columns, compact facts/items/totals and actions | `comparisons/confirmation.png` |
| Tracking | Green completed stages, original semantic exception colours and regular panels; current account shell and genuine events | `comparisons/tracking.png` |

The comparison deliberately preserves the current composition instead of restoring the reference commit's larger type, spacing, obsolete quantity dropdown or upsell.

## Regression and responsive evidence

The theme contract is `tests/storefront-theme.test.cjs`, retaining all previous layout, quantity, stock/focus, unavailable-image and admin-isolation assertions. New checks cover the restored palette, actual loaded font faces/local font requests, preloads and regular serif weights across customer routes and authentication. CSS-owned Manrope footer labels and collection-tile titles retain their original 700/600 weights.

An independent read-only review found one overly broad serif-weight selector. It was narrowed, and both browsers were observed failing the added sans-role assertions before the fix and passing afterward. The reviewer confirmed resolution with no remaining findings. The existing hero/layout test's footer expectation now uses the stone token; its geometry assertions remain intact.

| Check | Result |
| --- | --- |
| `pnpm run lint:fix` | Passed |
| `pnpm run format` | Passed |
| `pnpm run build` | Passed |
| `pnpm run type-check` | Passed |
| `pnpm test` | 560 tests: 512 passed, 48 environment-dependent skips, 0 failures |
| `graphify update .` | Completed; 2,934 nodes / 6,838 edges |
| Frozen `pnpm run test:responsive` | First suite passed: 735 route/viewport/DPR/text-size captures. Remaining suites stopped at the user's request |
| Additional browsing/auth/menu/bag matrix | 120 views, 0 failures: Chromium/WebKit × 320/390/768/1280/1440px × normal/200% text |
| Expanded card matrix | Both engines at all five widths, normal/200% text, in the regression suite |
| Additional live UPI QR fixture matrix | 20 views passed across both engines, all five widths and normal/200% text; white QR background and reachable keyboard status action asserted |

The additional matrix checks real font loading, regular serif weights, text scaling, missing images, field sizes, horizontal overflow and keyboard focus. The unchanged journey/overlay suites additionally cover long content, unavailable images, account state, checkout actions and focus restoration. Local findings, screenshots, command logs and comparison boards are retained in `dev-scripts/theme-restoration/`; authenticated journey evidence is under `responsive-audit/redesign/journey/`.

Source, test, configuration and asset hashes were frozen for 473 files before the final matrix/suite runs. All 473 remained unchanged afterward. Generated responsive captures are intentionally outside that source freeze. The five remaining responsive suites were not completed because the user explicitly waived that remaining step.

## Limits

The premium static audit retains the same 35 documented native-validation/textarea-resizing findings as the baseline, with no new findings. These are the explicit behavior-preservation exceptions in `UX-CONTRACT.md`. DESIGN.md lint reports 0 errors and one existing-format warning because the maintained document uses Markdown tables rather than YAML frontmatter.

The 48 skipped tests require database, staging or provider environments. Browser payment evidence uses deterministic SDK responses and blocked provider mutations; it does not represent live settlement or physical-device QR scanning. Graphify reports its existing missing `tree_sitter_sql` dependency and refreshed automatic community labels; this task changes no SQL.
