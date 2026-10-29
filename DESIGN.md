# Muvira design identities

Muvira is an English-language Indian storefront for god idols, puja products and home pieces. The approved white-and-blue design uses compact commerce and account workspaces alongside the existing photographic homepage, collection and product composition. Reference presentation backgrounds are not website surfaces. The admin workspace remains independent.

Runtime CSS in `client/src/index.css` is authoritative (ownership model B). `client/tailwind.config.js` adapts those variables; shared components consume semantic classes. `DESIGN_SYSTEM.md` documents owners and `UX-CONTRACT.md` preserves behavior.

## Tokens and mapping

| Intent | Runtime owner | Accepted value | Consumers |
| --- | --- | --- | --- |
| White canvas and panels | `--background`, `--color-paper` | `#FFFFFF` | Storefront, header, footer, cards |
| Cool near-white | `--color-surface`, `--surface-alt` | `#F7F8FC` | Checkout canvas, subtle surfaces |
| Primary / hover / selected | `--color-primary`, `--color-primary-hover`, `--color-primary-soft` | `#0070F3`, `#005BCC`, `#EAF3FF` | Actions, selected controls, prices |
| Main text | `--color-ink`, `--foreground` | `#111827` | Headings and body |
| Secondary text | `--color-muted` | `#6B7280` | Metadata |
| Supporting text | `--color-ink-soft` | `#4B5563` | Longer secondary copy |
| Borders / field borders | `--color-line`, `--color-field-border` | `#E5E7EB`, `#9CA3AF` | Panels / identifiable inputs |
| Positive states | `--color-accent`, `--color-accent-soft` | Primary / selected aliases | Explicit success text and checks |
| Warning / danger | `--color-warning`, `--color-danger` | `#8A5B1E`, `#B03B31` | Distinct exceptional states |
| Text-entry focus | `--color-field-focus` | Paper mixed with 4% ink | Fields and search wrappers |
| Storefront type | `--font-sans`, `--font-display`, `--font-product` | Locally hosted Inter, variable 100–900 | Headings, body, products, controls |
| Brand artwork type | `--font-brand` | DM Serif Display, regular 400 | Existing Muvira wordmark only |
| Page / section / panel / hero | `--type-page`, `--type-section`, `--type-panel`, `--type-hero` | 28 / 24 / 18 / 40px; phone page 24px and hero 32px | Shared headings, semibold |
| Shape | `--radius-control`, `--radius-card`, `--radius-image` | 6 / 10 / 6px | Controls, panels and photos |
| Elevation | `--shadow-card`, `--shadow-premium` | 0 1px 3px / 0 2px 8px, charcoal at 4% | Restrained surface separation |
| Image hover | `--duration-image`, `--scale-image-hover` | 350ms, 1.06 | Fine pointers without reduced motion |

Body and product text are 14px/20px; metadata is 12–13px. Inputs stay at least 16px and actions at least 44px. Text grows naturally. Inter replaces storefront serif rules; no synthesized serif weights remain. Manrope and its previous geometry/palette are explicitly scoped to administration. Genuine payment brands retain their own colours. Logo images remain unframed.

## Composition

**Retained browsing composition.** The homepage keeps its manual photographic carousel beside collection tiles, collection mosaic, configured campaigns, featured merchandise, discovery paths, new arrivals and store story. Its hero uses 40px desktop/32px phone headings and sections use 24px. Product cards retain 4:5 frames; catalog grids reflow from four to three, two and one column. The shared product gallery retains square main photography, 64px thumbnail rails and complete originals in the lightbox. Main purchase actions precede description/specifications. No commercial facts, fallback merchandise or unsupported features are introduced.

The header and footer are white. Desktop header rows target minimum 72px and 44px, growing for text. Search, destinations and photographic collections-menu behavior remain intact. The footer retains brand, Explore, Your Muvira, configured contact and collection links; account labels follow authentication. Payment-provider branding is absent from the footer.

**Account.** “E-commerce account page, Order list” guides a compact identity header above a 1200px maximum workspace: 200px desktop navigation, 24px gap, small blue icons and pale-blue selected links. There is no initials badge or duplicate welcome. Overview retains independently loaded recent order, confirmed default address and compact personal-info entry. Existing personal/address hashes preserve drafts and reset on identity changes. Utilities remain below navigation. Below 1024px navigation wraps above content. Bordered order cards use the actual first-item image, reference, date, status, count, total and separate View order/Track order actions without per-order reads.

**Cart.** “eCommerce App Designs, Views 2_31M” guides compact progress and rows beside coupon/summary panels. The 1120px maximum container uses a 3:2 grid with 24px gap. Each row aligns an 80px image, wrapping product details, minus/value/plus, right-aligned total and removal. Content-width breakpoints rearrange controls before labels become squeezed. The page minimum is one; the shared drawer control retains decrement-to-remove. No featured upsell, duplicate Continue shopping link or forced empty space remains. One blue checkout action follows authoritative totals.

**Shipping and payment.** “Daily UI … Checkout Page” guides the cool near-white canvas, white 20px desktop/16px phone panels and the same 3:2 grid, stacked below 1024px. Saved address/form comes before delivery method and billing; street precedes city/PIN/state in keyboard order. Billing expands from Same as delivery address. Product previews, promo and totals occupy the right column. Shipping has one Continue to payment action.

Payment is a stack of enabled methods in the existing order, each with a radio, full label and genuine supported artwork or generic coloured icon. Only the chosen method expands. `PaymentArtwork` gates card logos on confirmed network values and app logos on confirmed UPI codes; provenance lives in `client/public/images/payments/README.md`. Card fields follow number → expiry/CVV → cardholder name. UPI uses concise instructions, supported app tiles or the provider QR with its quiet zone and expiry state. Separate Review payment and Pay stages, frozen totals, recovery and transient SDK-only credentials remain intact.

**Orders.** “Order Confirmation with order status” guides equal columns: confirmation/order facts/address left and purchased items/totals right, with compact actions below. Pending/failure surfaces share type and spacing while keeping distinct state and recovery. Details reuse item/address/payment/summary cards. “Order tracking page design of an e-commerce website” guides the compact order header, progress, real events, courier/AWB facts, products and address/payment recap. Completed stages are blue with checks/text; exceptions replace ordinary progress. Missing dates/events are never invented.

## Responsive and interaction rules

Use 16px phone gutters. Columns stack below 1024px; fields and rows also respond to available content width and enlarged text. Labels remain complete. Sticky summaries/purchase panels activate only when the shared viewport-fit hook permits; the single mobile primary action includes safe-area spacing and yields to text entry/footer. Loading buttons retain geometry and labels. All stateful motion uses framer-motion and respects reduced motion.

CustomerPageHeading owns page introductions and optional breadcrumbs/actions. Top-level Shop, Collections, Search, Profile and orders omit breadcrumbs. Deeper collection/product/order views keep wrapping parent links. Labeled destinations omit decorative arrows; functional back, gallery, pagination, breadcrumb and disclosure controls retain their navigation icons.

## Evidence and imagery

`client/public/fonts/README.md` records Inter and retained admin/brand fonts with licenses. Existing editorial/collection README files record original configured photographic sources, prompts and fidelity comparisons. Exact-source image substitutions, failure states and full-image lightboxes retain their existing behavior.

The browser design contract is `tests/white-blue-storefront.test.cjs`; payment branding/credential/expiry cases live in `tests/custom-checkout-browser.test.cjs`. The full responsive suite covers Chromium/WebKit and the 320/390/768/1280/1440px normal/enlarged-text journey matrix. Reference-comparison evidence is recorded in `docs/verification/white-blue-storefront.md`.

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
