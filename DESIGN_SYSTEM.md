# Muvira design system

Runtime CSS variables in `client/src/index.css` are the source of truth. `client/tailwind.config.js` adapts them for React components. [DESIGN.md](DESIGN.md) records the approved editorial direction; [UX-CONTRACT.md](UX-CONTRACT.md) records shared behavior.

## Foundations

- DM Serif Display (`font-display` / `font-serif`) is used at regular weight for editorial headings. No synthesized bold or italic.
- Manrope (`font-sans` and `font-product`) is used for body, navigation, products, prices, fields and all admin interfaces. Full licensed fonts are self-hosted under `client/public/fonts/`.
- Warm white canvas, white surfaces, stone borders, charcoal text, muted green-grey secondary copy, and deep green actions come from runtime tokens.
- Deep green is reserved for actions, selected controls, prices and hover states. Status colors retain semantic meaning.
- Page width is 1320px including responsive gutters. Four-column grids collapse to three, two and one as space requires.
- Controls use 8px radii; cards and imagery use 12px. Logo images are never framed.

## Canonical owners

| Capability | Owner |
| --- | --- |
| Actions and fields | `components/ui/Button`, `Input`, `Textarea`, `Select` |
| Authored selections | `components/ui/Dropdown` |
| Breadcrumbs and pagination | `components/common/Breadcrumbs`, `Pagination` |
| Dialog and focus restoration | `components/common/Modal`, `lib/hooks/useDialogFocus` |
| Toasts | `context/ToastContext`, `components/common/Toast` |
| Product cards and quick view | `components/catalog/ProductCard`, `QuickViewModal` |
| Checkout progress | `components/checkout/FlowHeader`, `CheckoutSteps` |
| Admin navigation and layout | `components/admin/AdminShell` |

Form controls remain at least 16px with 44px targets. Motion uses framer-motion with `MotionConfig reducedMotion="user"`; CSS reduced-motion rules also disable decorative transitions. Hero navigation is manual. Errors remain distinct from empty content. Product specifications use only existing metadata and weight. No unsupported features or fabricated commercial content are introduced.
