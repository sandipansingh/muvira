# Immersive heritage redesign

The customer storefront now uses a continuous stone-mandir hero, a compact ivory header, round collection discovery, filled 4:5 merchandise, asymmetric configured campaigns, and a larger product gallery. All 16 customer pages share the typography, spacing, image and control system. Services, authorization, integer-paisa boundaries, server totals, payment handoff and recovery state rules are preserved. No API, schema or commerce-domain types changed.

[Open the screenshot gallery](heritage/index.html). The 62-image gallery includes every customer page family at desktop/mobile sizes, payment and invoice/tracking states, hero variants and key overlays. Full PNGs, tablet and enlarged-text evidence remain in the ignored `responsive-audit/redesign/` directory. Gallery data is isolated fixture data and public catalog photography.

## Delivered behavior

- Compact header in normal interior flow and floating over the home scene. Its content-capacity container query switches to menu navigation when text enlargement would wrap labels. Collections extends the shared Dropdown with actual category links and keyboard navigation; God Idols appears only when available.
- Six optimized desktop/mobile WebP hero compositions map only to exact configured source photographs. Titles, subtitles and manual navigation remain configured. Unknown photographs display directly with contrast protection; absent legacy category destinations lead to `/shop` without changing settings.
- Product, category and campaign cards fill their frames. Fine-pointer hover uses 1.06× over 350ms; touch/reduced motion retain still imagery and visible actions. Commerce thumbnails are square, and StoreImage handles failures. Catalog photographs remain authoritative on detail pages.
- Product detail uses approximately 58/42 columns and an uncapped, full-photo gallery. In-frame pointer zoom replaces the external magnifier. The accessible lightbox provides previous/next, 1×/2×, pan buttons, dragging, reset, arrow keys, Escape and focus restoration. Long visual titles are clamped while their full accessible names remain available.
- Search brings a labeled query, count, removable filters, sort and merchandise together. Price fields and queries restore with URL history, including rapid clear/back. Paging still resets after filter changes and scrolls to results.
- Shopping bag, shipping/payment, authentication/recovery, profile/addresses/email preferences, order history/detail/tracking/invoice, paid/pending/unknown outcomes and 404 use the same system. Password recovery prefills the sign-in email. Care appears only when supplied in catalog metadata; reviews remain genuine service data.

## Verification

All five responsive groups passed across the full run and the frozen-source rerun of the authenticated group: 1,042 route, state and overlay cases. The last targeted heritage rerun also checks that enlarged lightbox controls fit horizontally.

| Check | Result |
| --- | --- |
| Required lint fixes → format → build → type-check → regression tests → graph update | Passed; 120 regression tests passed, 29 environment-gated tests skipped |
| 735 public route/viewport/DPR/text cases | Passed |
| 22 public overlays | Passed |
| 185 authenticated/content-state screenshots | Passed after rerun with source frozen |
| 43 protected overlays | Passed |
| 57 heritage image/input/gallery/purchase cases | Passed, including the final narrow-control assertions |
| Independent whole-change review | Two important findings reproduced and fixed: dropdown selection focus and broken-image lightbox fallback |
| Gallery files, viewport filters and mobile reflow | Passed |

The premium static auditor still reports 28 native-validation and 11 resizable-textarea findings. The maintained UX contract explicitly preserves these controls during this presentation migration; disabling validation or resizing to silence the generic auditor would weaken existing behavior.

Provider-dependent/integration tests require the configured local/staging environment. Fixture downloads use a fixture PDF, and provider writes are blocked or stubbed. This work does not certify live provider operation. Root font scaling and effective viewport sizes approximate enlarged text/browser zoom; physical devices and screen-reader announcements were not independently certified. Graphify updates the code graph; its existing optional SQL parser is absent, so SQL extraction remains unavailable.

## Execution decisions

Work stayed in the existing clean feature checkout, preserving the repository's established fixture paths and local references. Native validation and resizable textareas remain governed by the existing UX contract. Header compact-mode selection uses available content capacity in rem, so increased text size remains readable. The category-heading photograph uses the same failure owner as other store photography. These are presentation decisions; no product capability or commerce rule was added.
