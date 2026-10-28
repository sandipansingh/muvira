# Muvira rich shopping identity

Muvira is an English-language Indian storefront for god idols, puja products and home pieces. Large, faithful product photography and generous space support thoughtful browsing; operational screens use compact, legible controls.

The approved redesign replaces the previous type and color direction. Runtime CSS in `client/src/index.css` is authoritative (ownership model B). `client/tailwind.config.js` adapts those variables; shared components consume the semantic classes. `DESIGN_SYSTEM.md` documents implementation and `UX-CONTRACT.md` records behavior.

## Tokens and mapping

| Intent | Runtime owner | Accepted value | Consumers |
| --- | --- | --- | --- |
| Warm white canvas | `--background` | `#FAF8F4` | Page shells |
| White surface | `--color-paper` | `#FFFFFF` | Controls, panels |
| Stone | `--surface-alt`, `--color-line` | `#E9E3D9` | Footer, borders |
| Charcoal | `--color-ink` | `#1F2521` | Headings, text |
| Muted green-grey | `--color-muted` | `#657168` | Secondary copy |
| Deep green | `--color-primary` | `#334B42` | Actions, prices, selected controls |
| Muted brass decoration | `--color-brass` | `#98753A` | Fine rules, restrained heritage details |
| Image hover | `--duration-image`, `--scale-image-hover` | 350ms, 1.06 | Browsable cards on fine pointers only |
| Display face | `--font-display` | DM Serif Display, regular 400 | Editorial headings |
| Utility face | `--font-sans`, `--font-product` | Manrope, variable 200–800 | Body, products, prices, admin |
| Layout | `.layout-container`, `.editorial-container` | 1320px maximum, responsive gutters | Storefront pages |
| Shape | `--radius-control`, `--radius-card` | 8px, 12px | Shared controls and panels |

## Composition

The signature is a composed shopping stage: the configured manual carousel takes roughly two-thirds of the desktop opening, beside two photographic collection destinations. A solid full-width header places a labeled search field between the original logo and account/bag controls, with a dedicated merchant-selected category row. The shared Dropdown navigation variant opens a photographic directory of every active collection. Phones retain visible search, grouped expandable navigation, and deliberately stacked photography.

All active categories participate in the homepage mosaic and collection directory. Featured merchandise, a category spotlight (or configured campaigns), deity searches, supported budget links, a differently composed new-arrivals section and an image-led store story create multiple paths through the real catalog. Small catalogs can repeat the same genuine products across these distinct sections. No counts, ratings or commercial facts are inferred.

Catalog grids use four desktop, three tablet, two mobile columns, then one below 360px. Product-card photographs fill consistent 4:5 frames with centered crops; purchase and quick-view actions sit beneath the image and remain available to touch and keyboard users. Product galleries and quick view retain complete photographs. Collection photography uses varied scales. The directory has a lead collection, jump links and varied photographic sections; results retain category introductions, sibling destinations and URL-owned selections.

The desktop product gallery shows up to four ordered original photographs, two across, plus a complete lightbox. A single photograph receives one full frame. Mobile exposes every photograph through swipe, arrows and a position indicator. Opening any displayed photograph selects its corresponding lightbox image. Lightbox previous/next, 1×/2×, reset, drag, labeled pan, arrow keys, Escape and focus restoration remain shared behavior. The purchase panel sticks only when it fits below the measured header. Specifications prefer metadata, then recognize explicit labeled facts in descriptions; the original description remains intact and care stays conditional on supplied instructions.

Commerce screens use larger complete item photographs, distinct summary surfaces and a focused checkout/outcome header. Account navigation, photographic order cards, shipment timelines and payment-state compositions share the same tokens and primitives. Authentication uses one compact, single-column popup over the current shopping page, with a small unframed logo, existing typography and no large image. Sign-in, signup, recovery and email confirmation share that popup. Styling is scoped to storefront/auth surfaces; shared selection and admin behavior remains intact.

DM Serif Display uses no synthesized bold or italic. Manrope supports the rupee sign. Full licensed font files are self-hosted. Admin headings use Manrope. The unframed original Muvira logo remains unchanged. Shared brand labels use a single line with a 0.08em downward optical adjustment to center the visible letters beside the logo.

## Navigation iconography

Customer destination links use clear text without decorative arrows, including section links, collection cards, discovery paths, hero actions, search submission, empty states, checkout/recovery actions, quick-view details and labeled outcomes. Order cards display “View order”. Keep arrows and chevrons when they operate navigation: galleries/carousels, lightbox panning, pagination, breadcrumb separators, dropdowns/disclosures and dedicated back actions. Admin controls retain their established iconography. Link hover/focus states, spacing and touch targets remain visible without extra ornaments.

## Evidence and imagery

`client/public/images/editorial/README.md` records the configured hero scenes. `client/public/images/collections/README.md` records three new category scenes, exact source matches, complete prompts, responsive optimization and side-by-side fidelity comparisons. A reviewed composite is selected only when its exact source photograph remains configured. New or changed content uses its own image. Unconfigured content uses an empty atmospheric setting and the approved generic hero; it never introduces products, prices or sales claims.

## Verification

The existing commerce regression tests remain authoritative for behavior. The responsive suite uses isolated authenticated customer and admin fixtures, all route families, protected-route guest checks, keyboard/touch interactions, overlays, reduced motion and enlarged text. Raw captures are development evidence under `responsive-audit/redesign/`; the review gallery and verification report live under `responsive-audit/rich-shopping/`.
