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
| Removable catalog selections | `components/catalog/ActiveFilters` |
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

`--duration-image: 350ms` and `--scale-image-hover: 1.06` govern browsable photography. Fine pointers with no reduced-motion preference receive zoom; touch and reduced-motion users see still images and persistent actions. Product-detail images remain complete at rest. The approximately 58/42 gallery/purchase layout stacks below desktop; the gallery has no short fixed height cap. Lightbox navigation, 1×/2×, reset and drag all have keyboard/button equivalents.

Hero composites are matched only to exact configured source URLs. Unknown photographs render directly with contrast protection. Missing legacy category destinations resolve to `/shop` in presentation without changing stored settings. No commerce types, APIs, schema or payment behavior change.

Lightbox icon actions keep 44px targets when text enlarges; the control groups stay within the dialog's content width. Gallery titles use Manrope, preserve the full accessible name, and clamp their visual height. Dropdown keyboard opening focuses only the committed popup; selection restores the trigger after pending work unless focus has moved elsewhere.

## Rich shopping storefront

The approved composition is maintained in `DESIGN.md`. Runtime colors, typography, geometry and responsive rules remain in `client/src/index.css`; Tailwind maps those tokens without duplicating their values. Customer selectors use `storefront-shell` or `auth-page`. The header, collection directory, photographic Dropdown variant, filled product-card frames, viewport-fit sticky panels and account/commerce surfaces share this system. Product galleries and quick view preserve complete photographs. The shared `brand-wordmark` class owns the single-line logo-label alignment and its font-relative optical adjustment. `collectionImage.ts` owns exact-source substitutions and `productPresentation.ts` owns conservative description facts.

## Authentication popup

Customer sign-in and signup use the shared compact AuthDialog over the current page. Reuse Modal, Input and Button with the unframed logo and existing tokens. Recovery and email-confirmation messages replace the form inside that dialog. Fields remain at least 16px and controls at least 44px. Passwords clear when switching or closing. Profile loading gates completion; profile errors provide retry and sign-out. Legacy auth routes are compatibility entries, and /reset-password remains the emailed recovery route.

## Customer navigation icons

Use text-only destination links and labeled actions across customer pages. Order cards include visible View order text. Retain arrows/chevrons for gallery and carousel controls, lightbox pan controls, pagination, breadcrumb separators, dropdowns/disclosures and dedicated back actions. Keep existing admin controls. Remove obsolete icon spacing/selectors while preserving link styling, visible hover/focus, mobile search labels and 44px targets.
