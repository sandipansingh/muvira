# Muvira design system

Runtime CSS variables in `client/src/index.css` own the cream, forest-green and brass storefront system. `client/tailwind.config.js` adapts semantic colours, fonts, radii and heading sizes. [DESIGN.md](DESIGN.md) records accepted values and references; [UX-CONTRACT.md](UX-CONTRACT.md) records behavior.

## Foundations

- Editorial, page and panel headings use local DM Serif Display at regular 400 without synthesized bold. Body, controls, product titles and prices use local Manrope. Page headings are 28px desktop/24px phone, sections 24px, panels 18px, hero 40px/32px. Body/product copy is 14px/20px, metadata 12–13px, fields at least 16px and targets at least 44px.
- Cream canvas/header, white panels, warm subtle surfaces and a stone footer surround forest-green actions and pale-green selected controls. Main text is charcoal, borders warm stone and decoration brass. Success, information, warning and error states retain distinct semantic colours plus text/icons. Genuine payment logos keep their colours; QR backgrounds remain white.
- Controls/images use 6px radii and cards 10px. Shadows are restrained. Logos remain unframed; the existing Muvira wordmark uses its independent brand font.
- Browsing uses `--browse-max-width: 1760px` and `--page-gutter`: 32px desktop (1024px+), 24px tablet (768–1023px), 16px phone. `layout-container` and `editorial-container` align header, page sections and footer. Account retains 1200px with a 200px rail/24px gap; checkout retains 1120px and narrower forms keep their caps. Columns stack below 1024px.
- Below 768px, featured/new-arrival/related rows opt into `mobile-product-shelf`: 78vw cards capped at 288px, next-card preview, native start snapping, visible scrollbars, named keyboard-focusable regions and focus-safe padding. New-arrival cards use the same vertical composition on phones; featured loading cards retain shelf geometry. Shop/Search results remain vertical grids. Inline icons do not shrink and groups wrap whole controls before squeezing short labels.
- Admin retains Manrope, its complete scoped palette, 8px controls, 12px panels and existing geometry.

## Canonical owners

| Capability | Owner |
| --- | --- |
| Actions and fields | `ui/Button`, `Input`, `Textarea`, `Select` |
| Selectors and navigation disclosure | `ui/Dropdown` |
| Quantity | `cart/QuantityControl`; minimum one on page, zero in drawer |
| Payment artwork | `checkout/PaymentArtwork`; availability from existing Razorpay SDK |
| Store images and failures | `common/StoreImage` |
| Catalog reset / collection shortcuts | `catalog/CatalogSidebar`, `CollectionShortcuts` |
| Product gallery and lightbox | `product/ImageGallery` |
| Breadcrumbs / pagination | `common/Breadcrumbs`, `Pagination` |
| Dialog and focus | `common/Modal`, `lib/hooks/useDialogFocus` |
| Toasts | `context/ToastContext`, `common/Toast` |
| Page introductions / account layout | `common/CustomerPageHeading`, `auth/AccountShell`, `AccountNavigation` |
| Order history / invoice | `orders/OrderListPanel`, `orders/OrderCards.InvoiceButton`; list payload, URL view/page |
| Checkout progress / summary | `checkout/FlowHeader`, `CheckoutSteps`, `CheckoutSummary`, `FlowCartSidebar` |
| Order cards / shipment | `orders/OrderCards`, `ShipmentProgress` |

Preserve account drafts/reset/retry behavior, authoritative money, checkout restoration, frozen totals, transient credentials and reconciliation. Sticky panels use the viewport-fit hook. Native validation remains as documented in the interaction contract. Shared busy Buttons retain accessible names and geometry. Product photos keep cover framing and full originals in lightboxes. Existing hover/touch/keyboard collection navigation remains unchanged. Unsupported optional features and commercial fallbacks stay absent.

## Independent administration system

The administration palette and geometry are documented in `DESIGN.md` and owned by the `.admin-theme` variables in `client/src/index.css`. `AppContent` scopes the theme above the shell, dialogs, dropdowns and toast container, removing it on customer routes. Existing semantic Tailwind utilities continue to consume runtime variables. Storefront replacement tokens do not change admin values.

`AdminWorkspace` owns repeated page headings, filter search, result counts, semantic tables, loading/error/empty panels and textual status badges. `AdminShell` owns collapsible desktop navigation and the canonical mobile Modal. `AdminDialog` extends the shared Modal with explicit discard confirmation and busy dismissal protection. It keeps form DOM mounted while confirming a discard. Existing fields, native validation, dropdown, pagination, focus and toast primitives remain canonical.

`useAdminList` owns safe page parsing, URL filter updates and reduced-motion-aware scroll-to-results. `useAdminResource` provides independent read/retry state for overview sections. Inventory quantity changes use the existing absolute-stock API and confirmed saves. Product/category/media, fulfillment, refunds and reconciliation remain owned by existing service handlers.


`AdminRevenue` owns period controls, the four joined performance cells, SVG revenue rendering, pointer details, the accessible exact-value table, and the reporting-definition disclosure. The period is URL-owned; `useAdminResource` ignores stale completions, and previous-period values are never shown under a newly selected period. SVG colours consume admin tokens and negative data retains a zero baseline. Live order, inventory and recovery state remains independent of the selected reporting period.

Sidebar navigation search clears immediately and restores input focus. Account logout uses the shared auth mutation with synchronous duplicate protection, a busy control, and inline failure feedback. No presence claim is displayed.
