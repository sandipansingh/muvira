# Rich shopping experience — verification

Verified 2026-10-28 in Chromium against the isolated real-catalog snapshot. Open [the screenshot gallery](index.html) or its [capture manifest](manifest.json). The 122-image gallery covers all 16 customer pages, payment/shipping states, sparse/unconfigured merchandise, one/two/four/many product photographs, and major customer overlays on mobile, tablet and desktop.

## Implementation

- Search-led, solid full-width header with measured sticky geometry, merchant-selected direct links, a photographic all-collections panel, visible phone search and grouped mobile navigation.
- Composed carousel/collection opening, all-category mosaic, genuine merchandise, configured campaigns or category spotlight, deity/budget paths, distinct new arrivals, photographic story and useful footer.
- Collection directory, photographic result introductions/sibling links, URL-owned filtering/search/pagination, complete product frames and persistent purchase/quick-view actions.
- Desktop gallery of up to four ordered originals, all-photo mobile navigation, matching complete lightbox, viewport-fit purchase/summary panels, metadata-first specifications and preserved original descriptions.
- Refreshed cart/drawer, focused checkout header, auth/recovery, profile, order cards/tracking/invoice, paid/pending/failure and 404 compositions. All commerce services, authorization, inventory, server totals, Razorpay handoff and recovery contracts remain authoritative.
- Three generated collection scenes, nine responsive WebP variants and [documented original/scene comparisons](../../client/public/images/collections/README.md). Only exact configured source matches receive these scenes.

## Checks

| Check | Final evidence |
| --- | --- |
| `pnpm run lint:fix` | Passed |
| `pnpm run format` | Completed; unrelated baseline formatting was preserved |
| `pnpm run build` | Client and API passed |
| `pnpm run type-check` | Client and API passed |
| `pnpm test` | 141 passed, 29 environment-gated skips, 0 failed (170 tests) |
| `graphify update .` | Code graph refreshed; 0 LLM tokens used |
| Independent review | Two findings corrected with regressions: empty modal search focus and pagination/header collision; no Critical findings |
| Legacy route matrix | Passed: 21 routes × 35 viewport/DPR/text cases = 735 captures |
| Legacy overlay matrix | Passed: 22 captures |
| Authenticated routes | Passed: 45 routes/states × 5 viewports = 225 captures |
| Customer/admin overlays | 78 captures passed |
| Photography/input-state audit | 57 cases passed |
| Supplemental empty cart | Mobile, tablet and desktop passed |

The initial broad route/overlay sweep found short navigation touch targets and small drawer/search text. Shared target/text rules were corrected, with targeted regressions. One authenticated capture returned an empty page while development files were changing; that route matrix was rerun after the source stopped changing. The two route/overlay checks and the authenticated route check passed on final targeted reruns. All five canonical responsive checks are now green (1,117 cases), plus three supplemental empty-cart captures. Final recheck results replace the earlier development evidence; raw initial failures are not presented as passing runs.

Coverage includes touch and keyboard traversal, Escape/outside dismissal and focus restoration, header stability, browser search/filter history, unavailable stock, delayed/rejected cart additions, absent ratings, repeated merchandise sections, unknown/missing/broken imagery, loading/error/empty states, long content, reduced motion, 200% text, invoice download and distinct pending payment recovery. No live payment or shipping mutation was performed.

## Visual review

The composed opening and photographic directory apply the browsing density seen in [My Pooja Box](https://www.mypoojabox.in/collections/god-idols-murti) and [The Advitya](https://theadvitya.com/). Paired complete product photographs and a clear purchase hierarchy apply the product-information direction in the approved [Nestasia reference](https://nestasia.in/products/lord-ganesh-idol-ivory). Muvira retains its logo, DM Serif Display, Manrope and runtime green/ivory/brass tokens. Competitor images are not included in the application.

Desktop, tablet and phone compositions were inspected with the populated snapshot, overlapping sparse sections, unavailable imagery and absent configuration. Product photographs stay complete; category scenes vary in scale. New arrivals use a larger lead photograph with smaller companion items. Auth, account and commerce surfaces retain a denser operational hierarchy than the homepage.

## Limits and accepted repository contracts

- The 29 integration/provider/database tests remain skipped without their configured test environment. Static and browser regressions preserve existing contracts; they do not certify a live Razorpay, Shiprocket, Resend or production Supabase transaction.
- Chromium touch, DPR and enlarged-text emulation were exercised. Physical iOS/Android keyboards, Safari/Firefox and assistive-technology device testing were not performed.
- Fixtures isolate auth, commerce and provider requests. Captures use the recorded catalog for layout evidence, not live availability or merchandising counts.
- The premium static auditor reports the existing native-form-validation/resizable-textarea exceptions documented in [UX-CONTRACT.md](../../UX-CONTRACT.md). Replacing those workflows was outside this presentation change; the repository's native and server validation remains intact.
- Graphify's code update completed. Its optional SQL parser is unavailable, so SQL semantic extraction and new document/image semantic labeling were not run. No database files changed.

## Saved evidence

[Machine-readable summary](checks.json), [viewport matrix](viewport-findings.json), [viewport overlays](viewport-overlay-findings.json), [authenticated routes](authenticated-findings.json), [customer/admin overlays](protected-overlays.json), [photography and input states](heritage-findings.json), [supplemental empty cart](supplemental-findings.json), [static contract exceptions](static-contract-findings.json).

Final responsive reruns used:

```sh
pnpm exec playwright test tests/responsive.spec.ts --grep 'storefront routes reflow|mobile and desktop overlays' --output=test-results/shopping-reflow
pnpm exec playwright test tests/responsive.spec.ts --grep 'authenticated customer and admin pages' --output=test-results/shopping-auth
```

The customer/admin overlay and photography checks passed in the full `pnpm run test:responsive` run. The targeted reruns complete that run's remaining failed checks after fixes; no failing check is omitted.

## Authentication popup milestone — 28 October 2026

Sign-in/signup and recovery screenshots now show the compact popup. Deterministic browser fixtures run the real AuthContext in React StrictMode and cover credentials, confirmation, delayed/failing profiles, profile retry/sign-out failure/retry, recovery completion, stale dismissal/reopening, validated return destinations, header/mobile/footer/cart/Buy now entry points, quantity preservation, focus and enlarged text. Independent review findings for StrictMode history replay, recovery focus restoration and returned sign-out errors were reproduced and fixed.

Required checks passed in order: lint:fix, format, build, type-check, test (190 passed, 29 environment-gated skips, zero failures), graphify update. Graphify refreshed the code graph; its optional SQL parser is not installed. Unrelated baseline formatting was preserved.
