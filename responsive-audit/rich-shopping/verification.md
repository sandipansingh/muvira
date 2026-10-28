# Storefront layout, product gallery and sitemap verification

Verified on 28 October 2026 with isolated customer/admin fixtures and real public catalog photography. Open the [122-image review gallery](index.html), [capture manifest](manifest.json), or [check results](checks.json).

## Changes

- Muvira's API has the private `muvira-catalog-api` network alias. The frontend SEO origin is `http://muvira-catalog-api:4000`. This avoids the generic `server` hostname, which live inspection resolved to two applications. Sitemap generation, active-product selection, timestamps, failure responses and indexing behavior remain governed by the existing SEO host.
- Customer icons stay beside the first label line. Controls wrap or stack as complete actions, and shared busy buttons retain their geometry and accessible names. The 404 page uses Shop, Collections and Home, stacked on phones.
- Authentication places the centered unframed brand and full-width heading in one Modal header with a 44px close control. Existing switching, recovery, profile gating, shopping state and focus behavior remain covered.
- Only the header collections Dropdown opts into fine-pointer hover: immediate opening without focus movement, a 150ms exit delay, panel travel, hovered clicks, keyboard focus hold, touch, Escape, outside interaction and route dismissal. Default/admin selectors retain their behavior.
- Collection shortcuts form one scrollable row at every width. Active and keyboard-focused collections are revealed within the row. Sidebar Reset and empty-results recovery replace duplicate filter chips; Shop clears all parameters and Search retains its query. Sorting, history, pagination and results scrolling remain covered.
- One shared gallery pairs a square cover photograph with vertical 64px desktop thumbnails or a horizontal mobile/tablet rail. The complete selected original opens in a centered contain lightbox. Single/zero/failed-image states, swipe, arrows, position, selection, zoom/pan, keyboard, Escape, focus restoration and product changes are covered.
- Balanced gallery/purchase columns use a quieter purchase surface, with title, price, availability, quantity and purchase actions before supporting description/highlights. Product facts, full descriptions, reviews, cart quantities and Buy now authentication retain their existing behavior.

## Verification

| Check | Result |
| --- | --- |
| Lint fix, formatting, build and type-check | Passed in the required order |
| Regression suite | 297 tests: 268 passed, 29 environment-gated skips, zero failures |
| Graph update | Completed; optional SQL parser is unavailable, with no SQL changes in this task |
| Deterministic Chromium/WebKit checks | 64 new cases across 320, 390, 768, 1280 and 1440px, enlarged text and reduced motion |
| Public route/viewport/DPR/text matrix | 735 cases passed |
| Public overlays | 22 cases passed |
| Authenticated customer/admin layouts | 225 cases passed |
| Protected editors/dialogs | 78 cases passed |
| Photography/navigation/input states | 57 cases passed |
| Complete responsive suite | All five checks passed: 1,117 cases |
| Supplemental empty cart | Mobile, tablet and desktop captures refreshed |
| Independent review | No remaining Critical, Important or Minor findings |

The responsive sweep verifies the final layout and interactions. The final exact-source crop adjustment was additionally checked in Chromium/WebKit and the complete regression suite. Source/cover comparisons covered the current 57 primary product photographs. One tightly framed 17-inch Ganesha source uses a square-only 50%/30% focal point to preserve its crown; other contexts and the lightbox retain the centered original. Square, portrait and landscape inputs are covered in deterministic fixtures.

The premium static auditor reports 39 existing form/textarea findings. Native validation and resizable textareas are deliberately preserved by [UX-CONTRACT.md](../../UX-CONTRACT.md); removing them without replacement would weaken existing behavior. Unrelated baseline formatting is preserved. Database/provider integration tests remain environment-gated; no live payment, shipping or customer mutation was performed by these checks.

## Release and rollback

Release uses the existing Dokploy Compose project `Tj28r084_gm_2hVaRHBC5` and its `deploy` branch. Preserve the production indexing value (`false` at inspection); add only the SEO API environment override. Verify unique DNS and repeated catalog requests inside the client, service health, public sitemap GET/HEAD/XML/gzip, www redirection, robots discovery, and desktop/mobile storefront behavior after rollout.

Previous deployment: `-s5g_qY5w4W7gAiRL8-0i`, commit `54b4d9cb75fcc05e072790e775ba99be417c47f5`. Previous frontend image: `sha256:b82b34898748240216aa100900877e4b2ea880948fd147443adbda3310107b5e`; API image: `sha256:826caa7889bfa2f4d51f9fa91bb2b998001d5b370cfa73acf0557f3bccb57627`. A UI rollback should retain the sitemap routing fix (`3339294`) and the unique-host environment setting. A private copy of the original environment and the live release results are retained in git-ignored local release evidence. No database rollback is required.
