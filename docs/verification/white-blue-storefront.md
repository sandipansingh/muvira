# White and blue storefront verification

Date: 2026-10-29. Base commit: `247791a`. Scope: storefront presentation and browser regression fixtures; no backend, database, public API or route changes. The existing administration system is explicitly isolated.

## Reference comparison

Reviewed actual desktop captures side by side with the assigned JPG references. Boards and full captures are retained locally under `dev-scripts/white-blue-final/`; they are ignored artifacts, not shipped assets. The references remain under `design-references/`. Reference presentation backgrounds were excluded. Comparison considers proportions, density, typography, alignment, surfaces and payment artwork; it is not a pixel-identical reconstruction of unrelated products or features.

| Surface | Assigned reference | Reviewed result / deliberate adaptation | Local board |
| --- | --- | --- | --- |
| Profile | E-commerce account page, Order list | Identity sits above the 200px navigation rail; selected row is pale blue, icons blue, content compact and bordered. Overview remains the landing view with recent order, default address and personal information; unsupported account destinations are absent. | `comparisons/profile.png` |
| Cart | eCommerce App Designs, Views 2_31M | Compact stepper and 3:2 product/summary grid; 80px image, wrapping name, aligned quantity, total and separate removal. Single-item total and checkout action fit 1440×900. Coupons remain in the summary column; gifting/wishlist reference-only controls are absent. | `comparisons/cart.png` |
| Shipping | Daily UI … Checkout Page | Cool near-white canvas with white panels, 24px gap, 20px panel padding, compact product/promo/total column, one action. Existing address, delivery and billing state is retained. | `comparisons/shipping.png` |
| Expanded card | Daily UI … Checkout Page | Stacked radio rows, only the selected method expanded; number → expiry/CVV → name. Genuine network marks depend on SDK capabilities. Review and Pay remain separate stages; reference-only methods are absent. | `comparisons/card.png` |
| UPI | Daily UI … Checkout Page | Same panel and control language, concise instructions, real inline QR with white quiet zone. App artwork is shown only for SDK-confirmed apps. No large promotional panel. | `comparisons/upi.png` |
| Confirmation | Order Confirmation with order status | Equal columns place confirmation, order facts and address left; purchased items and totals right. Blue explicit verified state, compact heading and existing track/detail/shopping actions. No invented delivery date or duplicate shopping action. | `comparisons/confirmation.png` |
| Tracking | Order tracking page design of an e-commerce website | Compact order header, shipment stages, actual courier/AWB/event, products and address/payment recap. Account navigation is retained. Only returned events are listed; progress uses the existing authoritative order state and exceptional states replace it. | `comparisons/tracking.png` |

Typography and surfaces are additionally asserted from computed styles: Inter storefront, 28px desktop heading, white header/footer, exact blue/cool-white tokens, 10px cards/6px controls. Admin assertions retain Manrope, its monochrome primary system, green/blue semantic palette and 12px/8px geometry. Existing admin drawer/table/focus suites cover shared primitives.

## Functional verification

Browser suites exercise account draft/reset behavior, hash/history navigation, default-address reconciliation, independent retries and stale-response protection. Cart tests cover pending and failed mutations, minimum one on the page, separate removal, drawer decrement-to-remove, stock reductions, the 100-unit cap and keyboard focus for immediate guest and asynchronous mutations.

Custom checkout tests exercise authoritative preparation, restored/frozen totals, card credentials sent directly to the SDK, clearing when changing method/leaving/submitting, QR creation/expiry, successful/pending/failed outcomes, duplicate payment events, confirmed cancellation and uncertain cancellation recovery. Artwork assertions check confirmed Visa/Mastercard/app mappings and generic fallbacks for absent network support. Existing loading-button tests check stable labels and geometry.

Final required checks ran in order: `pnpm run lint:fix`, `pnpm run format`, `pnpm run build`, `pnpm run type-check`, `pnpm test`, `graphify update .`; all exited 0. The regression suite reports **557 tests: 509 passed, 0 failed, 48 opt-in integration/provider checks skipped**. Logs are retained as `dev-scripts/white-blue-{lint,format,build,type-check,test,graphify}.log`. The first complete run exposed a 320px/200%-text drawer heading that clipped checkout and a WebKit cart removal target that outgrew its fixed column. Both were reproduced, corrected at their existing CSS owners, and passed in Chromium/WebKit. An obsolete tinted-footer assertion now checks the approved white surface.

Visual inspection also exposed cramped 200%-text checkout previews/recap in WebKit despite the initial no-overflow assertions. Product previews and delivery recaps now wrap by available width, progress labels remain whole, and the mobile action uses fixed gutters. The payment test asserts actual 28px product copy after field interaction and measures whole-word capacity; it failed before this correction and passed afterward in both engines. The journey audit forces a viewport reflow after text scaling and asserts the actual body text size. The independent visual review also checked cart, order history/details/tracking and shipping at 320px/200% in both engines. Copy now wraps into full rows where needed, and small unavailable thumbnails retain their accessible names with a compact icon. New whole-word and fallback-size assertions were observed failing, then passing. The reviewer confirmed these issues resolved. The public audit now recognizes the approved 12px cart metadata while retaining its 14px body threshold.

## Frozen responsive verification

After the required checks, `pnpm run test:responsive` passed all six groups in 21.8 minutes, covering **1,372 cases**. Source hashes remained unchanged throughout the final run. The log is retained at `dev-scripts/white-blue-responsive.log` and the source manifest at `dev-scripts/white-blue-frozen.json`.

| Group | Cases | Result |
| --- | ---: | --- |
| Public storefront routes: 21 routes × 35 viewport/DPR/text combinations | 735 | Passed |
| Public mobile and desktop overlays | 22 | Passed |
| Authenticated customer and admin: 48 routes × 5 views | 240 | Passed |
| Protected editors, dialogs and focus restoration | 78 | Passed |
| Photography, navigation, gallery and purchase states | 57 | Passed |
| Account and purchase journey: 12 routes × 5 widths × 2 text sizes × 2 engines | 240 | Passed |

The journey matrix covers Chromium and WebKit at 320, 390, 768, 1280 and 1440px, with normal and 200% text, long content and unavailable images. The expanded-card checks additionally cover the same 20 engine/width/text combinations. Existing interaction suites cover keyboard focus and reduced motion. Final comparison captures and boards remain under `dev-scripts/white-blue-final/`, and full journey captures under `responsive-audit/redesign/journey/`.

The seven previously tracked public screenshots were refreshed with final output, including the [mobile cart](../../responsive-audit/after/cart__320x568-phone-dpr3.jpg), [populated cart at 200% text](../../responsive-audit/after/cart-populated__320x568-text-200-dpr1-text200.jpg), [homepage at 200% text](../../responsive-audit/after/home__320x568-text-200-dpr1-text200.jpg) and [desktop collection](../../responsive-audit/after/shop__960x540-desktop-dpr1.jpg).

## Review findings resolved

An independent read-only reviewer found two important quantity issues and one smaller limit issue. Decrement now corrects an overstock quantity directly to an allowed value; controls honor `MAX_CART_ITEM_QTY`; focus moves to the enabled sibling at a boundary only while it remains on the triggering control or has fallen to the document. Both engines cover busy and immediate updates. Each regression was observed failing before the fix and passing after it. The reviewer confirmed all three findings resolved.

## Static audit and limits

The premium static audit reports the same 35 existing native-validation/textarea-resizing findings as the baseline and no unresolved new findings. These are the explicit exceptions in [UX-CONTRACT.md](../../UX-CONTRACT.md): removing native validation or textarea resizing would change behavior outside this presentation scope. They are recorded rather than hidden by disabling validation.

Browser payment verification uses a deterministic Razorpay fixture and blocked external API calls. It does not claim live payment settlement, live delivery estimates or physical-device QR scanning. Provider provenance and the Inter SIL license are recorded with the locally served assets. Graphify completed successfully; its environment warns that SQL extraction is unavailable because `tree_sitter_sql` is not installed. This change contains no SQL edits.
