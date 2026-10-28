# Muvira design identities

Muvira is an English-language Indian storefront for god idols, puja products and home pieces. Large, faithful product photography and generous space support thoughtful browsing. The admin workspace has a separate operational visual system described below.

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

The signature is a composed shopping stage: the configured manual carousel takes roughly two-thirds of the desktop opening, beside two photographic collection destinations. A solid full-width header places a labeled search field between the original logo and account/bag controls, with a dedicated merchant-selected category row. The shared Dropdown navigation variant opens a photographic directory of every active collection on fine-pointer hover, click or keyboard interaction. Phones retain visible search, grouped expandable navigation, and deliberately stacked photography. Shop collection shortcuts form one scrollable row at every width, with full labels and nonshrinking images.

All active categories participate in the homepage mosaic and collection directory. Featured merchandise, a category spotlight (or configured campaigns), deity searches, supported budget links, a differently composed new-arrivals section and an image-led store story create multiple paths through the real catalog. Small catalogs can repeat the same genuine products across these distinct sections. No counts, ratings or commercial facts are inferred.

Catalog grids use four desktop, three tablet, two mobile columns, then one below 360px. Product-card photographs fill consistent 4:5 frames with centered crops; purchase and quick-view actions sit beneath the image and remain available to touch and keyboard users. Product main photographs fill a square frame; their lightbox and quick view retain complete originals. Collection photography uses varied scales. The directory has a lead collection, jump links and varied photographic sections; results retain category introductions, sibling destinations and URL-owned selections.

One shared product gallery pairs a large square main photograph with 64px thumbnails: a vertical scrollable rail on desktop and a horizontal row below the image on mobile/tablet. The main frame uses reviewed cover crops; exact-source square focal points protect important details in tightly framed portraits. Clicking the image or enlarge affordance opens the selected complete, centered original with contain sizing. Arrows, swipe and a position indicator expose every photograph; redundant navigation is absent for one image. Selection and zoom reset on product changes. Lightbox previous/next, 1×/2×, reset, drag, labeled pan, arrow keys, Escape and focus restoration remain shared behavior. Balanced desktop columns pair photography with a quiet purchase surface. Title, price, availability, quantity and purchase actions precede supporting description and highlights. The purchase panel sticks only when it fits below the measured header. Specifications prefer metadata, then recognize explicit labeled facts in descriptions; the original description remains intact and care stays conditional on supplied instructions.

Commerce screens use larger complete item photographs, distinct summary surfaces and a focused checkout/outcome header. Account navigation, photographic order cards, shipment timelines and payment-state compositions share the same tokens and primitives. Short actions stay whole; groups wrap or stack entire controls. Longer labels can wrap in a text column beside a nonshrinking icon. Authentication uses one compact, single-column popup over the current shopping page, with a small unframed logo and heading centered together in a balanced header beside its 44px close control. Sign-in, signup, recovery and email confirmation share that popup. Styling is scoped to storefront/auth surfaces; shared selection and admin behavior remains intact.

DM Serif Display uses no synthesized bold or italic. Manrope supports the rupee sign. Full licensed font files are self-hosted. Admin headings use Manrope. The unframed original Muvira logo remains unchanged. Shared brand labels use a single line with a 0.08em downward optical adjustment to center the visible letters beside the logo.

## Navigation iconography

Checkout uses a consistent delivery/payment workspace beside a photographic order summary. The delivery step includes billing, then payment presents enabled methods in a quiet selector. Review payment prepares the immutable order before a separate Pay action. Mobile keeps one primary action and total above the safe area; inline UPI QR uses the original provider payload on a plain high-contrast surface. Card fields are transient and never enter Muvira services.

Customer destination links use clear text without decorative arrows, including section links, collection cards, discovery paths, hero actions, search submission, empty states, checkout/recovery actions, quick-view details and labeled outcomes. Order cards display “View order”. Keep arrows and chevrons when they operate navigation: galleries/carousels, lightbox panning, pagination, breadcrumb separators, dropdowns/disclosures and dedicated back actions. Admin controls retain their established iconography. Link hover/focus states, spacing and touch targets remain visible without extra ornaments.

## Evidence and imagery

`client/public/images/editorial/README.md` records the configured hero scenes. `client/public/images/collections/README.md` records three new category scenes, exact source matches, complete prompts, responsive optimization and side-by-side fidelity comparisons. A reviewed composite is selected only when its exact source photograph remains configured. New or changed content uses its own image. Unconfigured content uses an empty atmospheric setting and the approved generic hero; it never introduces products, prices or sales claims.

## Verification

The existing commerce regression tests remain authoritative for behavior. The responsive suite uses isolated authenticated customer and admin fixtures, all route families, protected-route guest checks, keyboard/touch interactions, overlays, reduced motion and enlarged text. Raw captures are development evidence under `responsive-audit/redesign/`; the review gallery and verification report live under `responsive-audit/rich-shopping/`.

## Admin workspace

The four local `design-references/` images guide the administration system independently from the storefront. The product-management reference supplies table density, thumbnails and focused actions; the two Wink references supply the quiet sidebar and clear hierarchy; the finance reference supplies compact summaries and restrained violet actions. No chart, trend, customer directory, bulk operation or other capability is implied by a reference image.

The runtime owner remains `client/src/index.css`. The route-level `.admin-theme` wraps both `AdminShell` and shared feedback/overlays in `AppContent`. Existing Tailwind semantic classes consume those scoped variables; do not introduce another palette in components. Customer routes remove this scope during navigation.

| Role | Admin runtime value |
| --- | --- |
| Canvas / sidebar | `--background: #F6F6F8` / `--admin-sidebar-bg: #F1F1F4` |
| Work surface | `--color-paper: #FFFFFF` |
| Main / secondary text | `--color-ink: #202126` / `--color-muted: #636572` |
| Divider / field border | `--color-line: #E4E4E9` / `--color-field-border: #8A8D98` |
| Primary / hover / selected tint | `--color-primary: #6D4AFF` / `--color-primary-hover: #5B36DB` / `--color-primary-soft: #EFEBFF` |
| Typography | Self-hosted Manrope; headings 28px/600, sections 18px/600, tables 14px, fields at least 16px |
| Geometry | Sidebar 240px or 72px collapsed; header 64px; gutters 24px desktop and 16px phone; panel/control radii 12px/8px |

The original unframed Muvira logo stays intact. Admin headings use Manrope with no editorial serif treatment. Status colours retain their semantic meaning; violet is reserved for actions, selected controls, links and focus. Tables use thin dividers, modest row hover, explicit actions, right-aligned monetary values and textual status badges. Product images use complete contain framing and the shared unavailable-image treatment.

The opening composition prioritizes real pending/confirmed work and low stock, followed by explicitly labelled today/all-time totals, recent orders, inventory and recovery. Long product names are visually clamped while retaining their complete accessible text. Forms and detail pages retain document scrolling; horizontal table overflow stays within its labelled container. The navigation becomes a shared Modal below 1024px. This is a light-only admin system.
