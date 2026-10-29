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
| Text-entry focus fill | `--color-field-focus` | Paper mixed with 4% ink | Text fields, textareas and search wrappers in both themes |
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

Catalog grids use four desktop, three tablet, two mobile columns, then one below 360px. Product-card photographs fill consistent 4:5 frames with centered crops; purchase and quick-view actions sit beneath the image and remain available to touch and keyboard users. Product main photographs fill a square frame; their enlarged lightbox retains complete originals. Collection photography uses varied scales. The directory has a lead collection, jump links and varied photographic sections; results retain category introductions, sibling destinations and URL-owned selections.

One shared product gallery pairs a large square main photograph with 64px thumbnails: a vertical scrollable rail on desktop and a horizontal row below the image on mobile/tablet. The main frame uses reviewed cover crops; exact-source square focal points protect important details in tightly framed portraits. Clicking the image or enlarge affordance opens the selected complete, centered original with contain sizing. Arrows, swipe and a position indicator expose every photograph; redundant navigation is absent for one image. Selection and zoom reset on product changes. Lightbox previous/next, 1×/2×, reset, drag, labeled pan, arrow keys, Escape and focus restoration remain shared behavior. Balanced desktop columns pair photography with a quiet purchase surface. Title, price, availability, quantity and purchase actions precede supporting description and highlights. The purchase panel sticks only when it fits below the measured header. Specifications prefer metadata, then recognize explicit labeled facts in descriptions; the original description remains intact and care stays conditional on supplied instructions.

Commerce screens use larger cover-cropped item photographs, distinct summary surfaces and a focused checkout/outcome header. Account navigation, photographic order cards, shipment timelines and payment-state compositions share the same tokens and primitives. Short actions stay whole; groups wrap or stack entire controls. Longer labels can wrap in a text column beside a nonshrinking icon. Authentication uses one compact, single-column popup over the current shopping page, with a small unframed logo and heading centered together in a balanced header beside its 44px close control. Sign-in, signup, recovery and email confirmation share that popup. Styling is scoped to storefront/auth surfaces; shared selection and admin behavior remains intact.

DM Serif Display uses no synthesized bold or italic. Manrope supports the rupee sign. Full licensed font files are self-hosted. Admin headings use Manrope. The unframed original Muvira logo remains unchanged. Shared brand labels use a single line with a 0.12em downward optical adjustment to center the visible letters beside the logo; the compact admin identity uses 0.08em.

## Navigation iconography

Checkout uses a consistent delivery/payment workspace beside a photographic order summary. The delivery step includes billing, then payment presents enabled methods in a quiet selector. Review payment prepares the immutable order before a separate Pay action. Mobile keeps one primary action and total above the safe area; inline UPI QR uses the original provider payload on a plain high-contrast surface. Card fields are transient and never enter Muvira services.

Customer destination links use clear text without decorative arrows, including section links, collection cards, discovery paths, hero actions, search submission, empty states, checkout/recovery actions, quick-view details and labeled outcomes. Order cards display “View order”. Keep arrows and chevrons when they operate navigation: galleries/carousels, lightbox panning, pagination, breadcrumb separators, dropdowns/disclosures and dedicated back actions. Admin controls retain their established iconography. Link hover/focus states, spacing and touch targets remain visible without extra ornaments.

The hero copy is vertically centered in the left-hand image space, independently of the slide controls. A 12px eyebrow, responsive 40–56px regular display heading balanced near 10ch, 16px description and collection action form the compact hierarchy. Phones place naturally growing copy above the photograph and separate manual controls.

The footer keeps its stone background and grouped brand, Explore, Your Muvira and configured contact columns, followed by genuine collection links and a quiet copyright row. The original logo stays unframed. Account links show Sign in for guests and Account details for signed-in customers. Payment-provider branding is absent.

The shopping bag is a 480px desktop drawer and full-width phone surface in ivory. Larger cover photographs, complete product names, prices and centered quantity controls precede an explicit summary surface. Its header and checkout area remain reachable while items scroll independently; unusually tall enlarged-text summaries also scroll within their bounded area. Checkout is a full-width green action above the secondary View shopping bag link. Coupon entry, server-derived totals, mutation failures, pending/unresolved items and guest sign-in keep their existing behavior.

All customer-facing product photographs use cover cropping: catalog, quick view, galleries, bag, checkout and orders. Reviewed square focal points apply only to square frames; enlarged originals remain centered with contain sizing. Logos, icons, QR codes and admin previews retain their framing. Broken photos remain visibly unavailable. Quick view uses a 28px product title and naturally stacked details and purchase controls. Shared action labels and icons align at their center; loading reserves the same geometry and enlarged labels can wrap.

## Evidence and imagery

`client/public/images/editorial/README.md` records the configured hero scenes. `client/public/images/collections/README.md` records three new category scenes, exact source matches, complete prompts, responsive optimization and side-by-side fidelity comparisons. A reviewed composite is selected only when its exact source photograph remains configured. New or changed content uses its own image. Unconfigured content uses an empty atmospheric setting and the approved generic hero; it never introduces products, prices or sales claims.

## Verification

The existing commerce regression tests remain authoritative for behavior. The responsive suite uses isolated authenticated customer and admin fixtures, all route families, protected-route guest checks, keyboard/touch interactions, overlays, reduced motion and enlarged text. Raw captures are development evidence under `responsive-audit/redesign/`; the review gallery and verification report live under `responsive-audit/rich-shopping/`.

## Admin workspace

The selected monochrome Wink reference (`design-references/fc6eecab29d604da14816f253ffb0aa0.webp`) is the administration system's visual authority, independently from the storefront. It supplies the pale sidebar, bottom account card, compact page heading, joined performance summaries, hatched revenue chart and operational right rail. Reference-only upgrades, visits, conversion rates and social activity have no product counterpart.

The runtime owner remains `client/src/index.css`. The route-level `.admin-theme` wraps both `AdminShell` and shared feedback/overlays in `AppContent`. Existing Tailwind semantic classes consume those scoped variables. Customer routes remove this scope during navigation.

| Role | Admin runtime value |
| --- | --- |
| Canvas / sidebar | `--background: #F7F7F7` / `--admin-sidebar-bg: #F7F7F7` |
| Work surface | `--color-paper: #FFFFFF` |
| Main / secondary text | `--color-ink: #191919` / `--color-muted: #666666` |
| Divider / field border | `--color-line: #E8E8E8` / `--color-field-border: #8A8A8A` |
| Primary / hover / selected tint | `--color-primary: #191919` / `--color-primary-hover: #333333` / `--color-primary-soft: #EEEEEE` |
| Typography | Manrope; page headings 26px/600, sections 18px/600, tables 14px, fields at least 16px |
| Geometry | Sidebar 240px or 72px collapsed; desktop content gutters 32px/24px vertical; phone gutters 16px; panels/controls 12px/8px |

The unframed original Muvira logo stays intact. Desktop pages have no duplicate top bar or top-right presence identity. Top-level sections omit breadcrumbs; order details retain shared compact hierarchy. The bottom account card exposes genuine identity, profile, Settings and guarded logout. Local sidebar search filters existing sections without network requests or invented destinations. Phones use a compact menu bar and shared Modal drawer navigation. This is a light-only admin system.

Overview pairs period-owned performance and revenue with independent live operational queues. The chart uses confirmed local money movements and remains honest about negative/zero/incomplete data. Thin dividers, restrained row hover, textual status badges and right-aligned currency apply throughout. Semantic status colours retain meaning. Tables scroll within named regions; content queries stack columns for narrow or enlarged-text layouts. Product images retain shared contain framing and unavailable-image behaviour.

Admin dialogs use the shared Modal's right-side drawer presentation: 480px standard, 640px wide, full viewport width below 768px. The drawer layer resets page spacing so its top and bottom align with the viewport. Headers and form-associated actions stay reachable while bodies scroll. Storefront popup composition stays centered. The order work area holds items, fulfillment and refunds/cancellation; the right sidebar holds customer/status, Documents, separate shipping and billing address cards, and internal notes. Invoice retains its existing download eligibility.

Settings groups Contact, Announcement, Shipping & fulfillment and Homepage content behind sticky in-page navigation with persistent saves. Issues & recovery uses compact genuine worker/backlog summaries, queue navigation and one visible incident table with drawer details. The grouped [Settings reference](https://dribbble.com/shots/27061991-SaaS-Settings-Dashboard-Design) and [incident table reference](https://dribbble.com/shots/23970269-Incident-Management-Web) inform hierarchy within the monochrome system.

Text-entry focus changes only the subtle semantic fill, without outlines, rings, glows or border accents on fields/search wrappers. Validation borders and button/link indicators remain visible; forced-colors mode uses its system focus indicator. Displayed emails truncate on one line while retaining full text and title for accessibility.
