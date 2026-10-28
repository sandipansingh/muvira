# Muvira design system

Runtime CSS variables in `client/src/index.css` are the source of truth. `client/tailwind.config.js` adapts them for React components. [DESIGN.md](DESIGN.md) records the approved editorial direction; [UX-CONTRACT.md](UX-CONTRACT.md) records shared behavior.

## Foundations

- DM Serif Display (`font-display` / `font-serif`) is used at regular weight for editorial headings. No synthesized bold or italic.
- Manrope (`font-sans` and `font-product`) is used for body, navigation, products, prices, fields and all admin interfaces. Full licensed fonts are self-hosted under `client/public/fonts/`.
- Warm white canvas, white surfaces, stone borders, charcoal text, muted green-grey secondary copy, and deep green actions come from runtime tokens.
- Muted brass `--color-brass` is reserved for restrained decorative rules; it never replaces semantic statuses.
- Deep green is reserved for actions, selected controls, prices and hover states. Status colors retain semantic meaning.
- Page width is 1320px including responsive gutters. Four-column grids collapse to three, two and one as space requires.
- Controls use 8px radii; cards and imagery use 12px. Logo images are never framed.

## Canonical owners

| Capability | Owner |
| --- | --- |
| Actions and fields | `components/ui/Button`, `Input`, `Textarea`, `Select` |
| Authored selections and navigation disclosure | `components/ui/Dropdown` (`navigation` renders real links) |
| Store photography and failures | `components/common/StoreImage` |
| Catalog reset and collection shortcuts | `components/catalog/CatalogSidebar`, `CollectionShortcuts` |
| Product gallery and lightbox | `components/product/ImageGallery` |
| Breadcrumbs and pagination | `components/common/Breadcrumbs`, `Pagination` |
| Dialog and focus restoration | `components/common/Modal`, `lib/hooks/useDialogFocus` |
| Toasts | `context/ToastContext`, `components/common/Toast` |
| Product cards and quick view | `components/catalog/ProductCard`, `QuickViewModal` |
| Checkout progress | `components/checkout/FlowHeader`, `CheckoutSteps` |
| Admin navigation and layout | `components/admin/AdminShell` |

Form controls remain at least 16px with 44px targets. Motion uses framer-motion with `MotionConfig reducedMotion="user"`; CSS reduced-motion rules also disable decorative transitions. Hero navigation is manual. Errors remain distinct from empty content. Product specifications use only existing metadata and weight. No unsupported features or fabricated commercial content are introduced.

## Immersive heritage composition

The homepage uses a full-width continuous mandir scene, compact circular categories, filled 4:5 merchandise, asymmetric configured campaigns, new arrivals and configured story/support. Header categories appear through the shared navigation Dropdown, alongside the conditional God Idols link. On interior routes the same header remains in document flow.

`--duration-image: 350ms` and `--scale-image-hover: 1.06` govern browsable photography. Fine pointers with no reduced-motion preference receive zoom; touch and reduced-motion users see still images and persistent actions. Product-detail main photographs fill a square frame with object-cover; full originals use object-contain in the lightbox. Balanced 1.1:1 gallery/purchase columns stack below desktop. The single gallery uses a bounded vertical rail of 64px thumbnails on desktop and a horizontally scrollable rail below the square on mobile/tablet. The rail follows selection without moving the page. Lightbox navigation, 1×/2×, reset and drag all have keyboard/button equivalents. Purchase actions precede supporting description and highlights, on a borderless surface using the existing canvas.

Hero composites are matched only to exact configured source URLs. Unknown photographs render directly with contrast protection. Missing legacy category destinations resolve to `/shop` in presentation without changing stored settings. No commerce types, APIs, schema or payment behavior change.

Lightbox icon actions keep 44px targets when text enlarges; the control groups stay within the dialog's content width. Gallery titles use Manrope, preserve the full accessible name, and clamp their visual height. Dropdown keyboard opening focuses only the committed popup; selection restores the trigger after pending work unless focus has moved elsewhere.

## Rich shopping storefront

The approved composition is maintained in `DESIGN.md`. Runtime colors, typography, geometry and responsive rules remain in `client/src/index.css`; Tailwind maps those tokens without duplicating their values. Customer selectors use `storefront-shell` or `auth-page`. The header, collection directory, photographic Dropdown variant, filled product-card frames, viewport-fit sticky panels and account/commerce surfaces share this system. Product lightboxes and quick view preserve complete photographs. The shared `brand-wordmark` class owns the single-line logo-label alignment and its font-relative optical adjustment. `collectionImage.ts` owns exact-source substitutions and `productPresentation.ts` owns conservative description facts.

## Authentication popup

Customer sign-in and signup use the shared compact AuthDialog over the current page. Modal's optional `headerBrand` slot groups the unframed logo and title in a centered header with balanced 44px side columns for the close control. Recovery and email-confirmation messages replace the form inside that dialog. Fields remain at least 16px and controls at least 44px. Passwords clear when switching or closing. Profile loading gates completion; profile errors provide retry and sign-out. Legacy auth routes are compatibility entries, and /reset-password remains the emailed recovery route. Shared Button labels retain their dimensions and accessible names under the centered busy indicator; leading icons occupy a separate, nonshrinking column.

Header collection hover is an opt-in Dropdown behavior; all other selectors retain click/keyboard behavior. CollectionShortcuts owns the single scrolling row and reveals the active category using only horizontal container scrolling. CatalogSidebar owns Reset; result cards have no duplicate chips or clear-filter toolbar.

## Customer navigation icons

Use text-only destination links and labeled actions across customer pages. Order cards include visible View order text. Retain arrows/chevrons for gallery and carousel controls, lightbox pan controls, pagination, breadcrumb separators, dropdowns/disclosures and dedicated back actions. Keep existing admin controls. Remove obsolete icon spacing/selectors while preserving link styling, visible hover/focus, mobile search labels and 44px targets.

## Independent administration system

The administration palette and geometry are documented in `DESIGN.md` and owned by the `.admin-theme` variables in `client/src/index.css`. `AppContent` scopes the theme above the shell, dialogs, dropdowns and toast container, removing it on customer routes. Existing semantic Tailwind utilities continue to consume runtime variables. No storefront token values change.

`AdminWorkspace` owns repeated page headings, filter search, result counts, semantic tables, loading/error/empty panels and textual status badges. `AdminShell` owns collapsible desktop navigation and the canonical mobile Modal. `AdminDialog` extends the shared Modal with explicit discard confirmation and busy dismissal protection. It keeps form DOM mounted while confirming a discard. Existing fields, native validation, dropdown, pagination, focus and toast primitives remain canonical.

`useAdminList` owns safe page parsing, URL filter updates and reduced-motion-aware scroll-to-results. `useAdminResource` provides independent read/retry state for overview sections. Inventory quantity changes use the existing absolute-stock API and confirmed saves. Product/category/media, fulfillment, refunds and reconciliation remain owned by existing service handlers.
