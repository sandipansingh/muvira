# Account overview and collection menu verification

The account composition follows the approved [Shopora reference](https://dribbble.com/shots/27393267-Shopora-Ecommerce-Customer-Dashboard-UI-Design) using Muvira’s existing fonts, tokens and footer. `/profile` provides three shortcuts, the real latest order and the confirmed default address. Detail hashes retain drafts within the authenticated workspace; changing identity resets it. Default-address create/edit results reconcile local flags immediately.

The collection dropdown has a full-width directory link and nine collections in three equal desktop columns with 80px photographs. Separate Shop all and New arrivals links remain in the navigation bar and footer. The existing mobile navigation and shared Dropdown interaction own their original breakpoints and input behavior.

## Browser evidence

- Chromium and WebKit: 320, 390, 768, 1280 and 1440px; normal and 200% text, long content, unavailable photographs, keyboard navigation, hash/history navigation and reduced motion.
- Thirty frozen account-view captures across both engines and all five widths found no horizontal overflow, duplicate page headings or fields below 16px. Actual catalog photographs were reviewed on the overview; stable open-menu captures were reviewed at 1280 and 1440px. Local evidence lives in git-ignored `dev-scripts/account-*.png` and `dev-scripts/account-visual-findings.json`.
- Browser contracts exercise independent preview loading, failures, retries and empty states; pending and failed profile/preferences/address/sign-out mutations; default create/edit reconciliation; account identity resets and obsolete order reads after hash navigation. Shared navigation tests cover hover, touch, Escape, focus and retained links.
- A fresh read-only review found no important actionable defects.

## Static UI audit

The strict premium audit reports the same 36 findings on the baseline commit `285ff18` and this change: 25 native-validation recommendations and 11 textarea-resizing recommendations. These are existing, documented policy exceptions in `UX-CONTRACT.md`; no new findings were introduced. Baseline and final JSON evidence are retained in git-ignored `dev-scripts/account-premium-{baseline,final}.json`.

## Repository checks

`pnpm run lint:fix`, `pnpm run format`, `pnpm run build`, `pnpm run type-check`, `pnpm test`, then `graphify update .` completed in order. The full regression run passed 485 checks, skipped 48 integration checks and failed none. Graphify rebuilt 2,871 nodes and 6,706 edges; it warned that the optional SQL parser is unavailable. This change contains no SQL edits.

`pnpm run test:responsive` passed all five audit groups: 735 route/viewport/DPR/text cases, 22 mobile/desktop overlays, 235 authenticated customer/admin views, 78 protected-editor/confirmation cases and 57 heritage/navigation/gallery cases. All 1,127 cases passed. The authenticated matrix now includes both account detail hashes, and the protected address-editor fixture opens its explicit address destination.
