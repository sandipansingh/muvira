# Muvira Storefront: Visual Audit and Design Token Proposal

**Status:** Review required before any component changes

**Scope:** Visual, layout, typography, responsive, and interaction treatment only. Existing routes, data loading, API calls, and commerce behaviour remain out of scope.

## Scope note

The active storefront is a React 19 + Vite application in `client/`, using React Router and Tailwind v3. It is not currently the Next.js SSR frontend described in the repository-level brief. This does not alter the visual proposal, but it means the eventual work should target `client/src/` and must not assume Next.js components or server rendering.

There are currently no FAQ, privacy, terms, cancellation, cookie, or policy routes in `client/src/App.tsx`. The FAQ and policy recommendations below are therefore patterns for existing support content or a later, separately approved route addition; they do not authorize a new route in this UI-only pass.

## Reference takeaways

The reference project contributes a useful structural language rather than literal travel styling:

- A small, legible palette: dark ink dominates, one accent is reserved for actions, and pale neutral surfaces create breathing space.
- Clear type jobs: a strong display face carries page and section hierarchy while body/UI copy stays calm and readable.
- Sections alternate between image-led editorial composition and unboxed informational layouts.
- Value propositions are a simple icon, title, and sentence—not a collection of elevated mini-cards.
- FAQ and policy content use rules, columns, and prose rhythm rather than repeated shadowed containers.
- Footer content is organised into four practical columns on a muted surface.

The supplied ecommerce photographs support a quieter material direction: tactile wood, considered negative space, close crops for product detail, and occasional wide environmental crops. They should not become a collage of competing image cards.

## Design direction

**Name:** Quiet workshop editorial

**Purpose:** Help a shopper understand the product, material, price, and purchase action in that order—then build confidence with concise proof.

**Tone:** Refined editorial with an honest workshop warmth. It should feel calm and specific, not precious or promotional.

**Differentiation anchor:** A full-width, warm-paper storefront where large product photography is paired with strong ink typography and thin architectural rules; terracotta appears only when a shopper can act.

**DFII:** 12/15 — impact 4, context fit 5, implementation feasibility 5, performance safety 4, consistency risk 6. This is strong if the accent remains rare and the card system is reduced rather than restyled.

This avoids generic ecommerce UI by using type, image cropping, and whitespace as the hierarchy instead of piling badges, pills, shadows, and animated card states onto every product.

## Audit

### System-wide findings

| Category | Finding | Evidence | Required direction |
| --- | --- | --- | --- |
| Palette | The declared system contains ink, cognac, green, red, warning amber, and their soft fills. Components then add slate, amber, emerald, white-glass, and inline hex variants. This makes several colours compete as visual “brand.” | `client/src/index.css:46-75`; `HeroSlider.tsx`; `PromoGrid.tsx`; `StockBadge.tsx` | Keep semantic success/warning/error for genuine states, but remove them from decorative commerce surfaces. Use ink, paper, warm neutral, terracotta, and a single rule colour for all non-status UI. |
| Tokens | Token names exist, but they are not the single source of styling: inline `#7e3d1c`/`#693116` classes appear throughout storefront components. | `client/src/index.css:45-75`; `ProductCard.tsx`; `HeroSlider.tsx`; `BestSellers.tsx`; `ProductInfo.tsx` | Move all visual values to a small CSS-variable/Tailwind token layer. Components should use semantic utilities, never raw hex. |
| Typography | Pangram and Red Hat Display are viable, but hierarchy is undermined by mixed `font-serif`, `font-sans`, `font-black`, `font-extrabold`, small all-caps labels, and three unrelated heading voices. | `client/src/index.css:5-105`; `Header.tsx`; `HeroSlider.tsx`; `PromoGrid.tsx`; `ProductInfo.tsx` | Retain Pangram for display and Red Hat Display for body/UI; assign a strict scale and weight range. Remove `font-black` and decorative all-caps where they do not convey category or metadata. |
| Cards | `editorial-panel` establishes a bordered, rounded surface as a default, then category, product, trust, promo, story, testimonial, filter, price, and service content repeat the same device. | `client/src/index.css:86-90`; all homepage section components; `FilterBar.tsx`; `ProductInfo.tsx` | Cards should be reserved for products, modal surfaces, and selected/input states. Information should be separated by spacing and hairline rules. |
| Radius | Nearly every surface is a rounded rectangle or pill, often nested three levels deep. The effect is soft but non-specific and obscures grouping. | `HeroSlider.tsx`; `ProductCard.tsx`; `PromoGrid.tsx`; `QuickViewModal.tsx` | Use square/near-square information layouts; reserve medium radius for image crops and small radius for controls. Pills only represent compact filters or a count/status. |
| Hover and motion | Many interactive targets change several properties at once: colour, background, shadow, scale, translation, image zoom, or gap. Some nonessential cards move and elevate on hover. | `ProductCard.tsx:24-104`; `CategoryGrid.tsx:79-100`; `HeroSlider.tsx:56-69`; `PromoGrid.tsx`; `TrustBadges.tsx`; `TestimonialSection.tsx` | One property per interaction. Keep a subtle colour change for links/buttons, a single image crop/scale response on product imagery, and the hero slide transition. Remove card lift and shadow elevation. |
| Hierarchy | Multiple “primary” signals coexist: eyebrow, badge, headline, two CTAs, review proof, dots, large image, floating product cards, and colour accents. Product cards likewise ask for image, discount, wishlist, rating, quick view, price, and add action at once. | `HeroSlider.tsx`; `ProductCard.tsx` | Make one visual decision per region: hero = headline + one CTA; card = product + price; PDP = product + purchase action. Secondary actions recede. |

### Homepage: `/`

| Component | Issues found | Visual consequence |
| --- | --- | --- |
| `HeroSlider.tsx` | Gradient surface, high-radius container, a decorative “Trending Now” pill, two equal-weight CTAs, five coloured initial circles, amber stars, carousel dots, a framed/shadowed image, and two glass product cards all compete. CTA hover changes background, scale, and active scale; secondary CTA also animates several properties. The mini product cards use hard-coded products and prices, so they read as promotional decoration rather than real merchandising. | The first fold has no clean reading order and looks assembled from common ecommerce motifs. |
| `TrustBadges.tsx` | Four business claims are each presented as a small bordered card, with an additional framed icon, background change, and shadow-lift hover. | Proof becomes decorative chrome rather than a calm credibility row. |
| `CategoryGrid.tsx` | Every category becomes a rounded bordered card within a rounded image frame, with card lift, shadow elevation, image zoom, title colour change, and arrow inversion on hover. The repeated “Shop now” adds noise to a link that is already self-explanatory. | Categories feel like a template grid rather than a curated theme strip. |
| `BestSellers.tsx` | The section uses a grey band, card-grid products, rounded filter pills, a heavy headline (“Today’s Best Deals For You!”), and a prominent rounded CTA. Empty/error states are also rounded cards. | “Deals,” category pills, and products compete for the same priority; the section does not feel editorial or product-led. |
| `PromoGrid.tsx` | Three large, highly rounded promotion cards introduce dark slate, amber, cognac, white-glass, three badges, three CTA styles, and group-hover gap animations. “New Season,” “Special Offer,” and “100% Solid Wood” are presented with equal promotional weight. | This is the clearest AI-slop cluster: too many messages, colour stories, and decorative pills in one row. |
| `CraftsmanshipStory.tsx` | A card wraps the entire editorial section, the image has a shadowed framed container plus glass caption overlay, and each of the four value propositions is another nested card with an icon tile. | The intended workshop story loses its calm, long-form authority to excessive containment. |
| `TestimonialSection.tsx` | A rating pill, bordered header, and three shadow-hover cards add unnecessary framing to short social proof. | Testimonials read as dashboard widgets instead of human remarks. |

### Catalogue: `/shop`

| Component | Issues found | Visual consequence |
| --- | --- | --- |
| `ShopPage.tsx` | The editorial page title is sound, but the filter surface directly below it is another large rounded card and pagination uses two button-like cards. Error content is boxed. | The page starts calm then immediately returns to component chrome. |
| `FilterBar.tsx` | Filter chips, container, sort control, and sort icon all create nested bordered surfaces. The selected category and sort need distinct treatment, but the shared rounded-card vocabulary blurs the distinction. | Filters receive comparable visual mass to the product grid. |
| `ProductCard.tsx` | A product is wrapped in a padded card with nested rounded image frame and image radius. It stacks discount badge, glass wish button, rating, quick view, price action row, and a filled add button. Hover simultaneously lifts/elevates the card and zooms the image; the wish button separately scales. | Product images lack prominence, product names are too quiet, and the shopper is asked to parse too many controls per item. |
| `QuickViewModal.tsx` | The modal is appropriate, but it repeats rounded image shells, thumbnail cards, a boxed price block, pill stepper, and two heavy button treatments. | A legitimate overlay becomes visually busier than the PDP. |

### Product detail: `/product/:slug`

| Component | Issues found | Visual consequence |
| --- | --- | --- |
| `ProductDetailPage.tsx` | The layout is structurally strong—breadcrumb, media, product information, details, reviews, related products—but all visual parts inherit the crowded card/product conventions. | This screen has the best foundation but does not yet give product photography and the purchase action enough controlled dominance. |
| `ImageGallery.tsx` | This is the least over-designed component: media is full-bleed and thumbnails use simple borders. The thumbnail active state is a useful exception, though its accent must use the proposed token. | Retain this restraint as the model for product media. |
| `ProductInfo.tsx` | Category, stock badge, rating, “premium finish” claim, boxed price, discount pill, quantity pill, filled add button, bordered wishlist action, and three service cards all appear before the accordion. The “In stock” badge is decorative for available inventory; the price container is a card without a separate task. | The point of decision—name, price, and add to cart—does not have a single dominant path. |
| `ProductAccordion.tsx` | Flat divided rows are already aligned with the desired FAQ pattern; only the heading scale and chevron motion need harmonising. | Keep as the source pattern for a future FAQ. |
| `ReviewsSection.tsx` | The review summary is correctly separated by rules, but “verified purchasers/buyer” repeats a badge-like claim, and the review form alert is boxed more heavily than needed. | Mostly restrained; reduce duplicated trust ornament. |

### Global shell and transactional screens

| Screen / component | Issues found | Visual consequence |
| --- | --- | --- |
| `Header.tsx` and `MobileMenu.tsx` | The header mixes a serif/editorial system with `font-sans` `font-black` logo treatment, large rounded search, circular utility actions, cart badge, pill account button, and dropdown card. Most hover states are sensible but inconsistent in strength. | The shell does not establish the design system before the page begins. |
| `AnnouncementBar.tsx` | A badge inside a dark notification strip is valid only when it communicates a real, time-bound condition. It should not be used for routine marketing labels. | Optional status treatment risks becoming another decorative pill. |
| `Footer.tsx` | The bottom four-column information grid is close to the reference, but a large pre-footer studio/contact CTA creates a second footer narrative and button cluster. It also lacks a newsletter column. | Footer hierarchy is split between a campaign panel and useful navigation. |
| Cart, checkout, order, account, and authentication screens | These screens repeatedly apply `border + bg-ivory + padding` to summaries, address choices, empty states, form groups, and notices. Status colours are appropriate for errors and stock, but coloured framed blocks should not be normal layout surfaces. Key files: `CartPage.tsx`, `CheckoutPage.tsx`, `OrderSummaryCard.tsx`, `AddressSelector.tsx`, `ProfilePage.tsx`, `OrdersHistoryPage.tsx`, `LoginPage.tsx`, and `SignupPage.tsx`. | Functional content reads as a loose collection of panels instead of a clear document with one transactional summary. |
| `StockBadge.tsx` | Out of stock and low-stock messages are real states. “In stock” is not usually a meaningful badge for an available product and adds another colour-coded element to each PDP/quick view. | Retain urgent stock status only; express ordinary availability in plain supporting text. |
| FAQ/policy | No current route or screen exists. The reference’s `FAQ.tsx`, `FAQsClient.tsx`, and `PolicyLayout.tsx` establish the intended treatment: eyebrow + heading + help CTA; accordion rows separated by rules; and plain, readable long-form prose. | Do not retrofit a card grid into content that does not currently exist. |

## Design token proposal

### Palette

The palette is intentionally asymmetric: ink owns reading and structure; terracotta owns action; pale clay creates atmosphere. Status colours are semantic exceptions and must never drive marketing styling.

| Token | Value | Job |
| --- | --- | --- |
| `--color-ink` | `#1C211D` | Primary text, icons, primary dark surface, selected structural controls. |
| `--color-paper` | `#FBF8F2` | Default page background; warm but not yellow. |
| `--color-surface` | `#F2EDE4` | Alternating section background, form field rest state, quiet image surround. |
| `--color-rule` | `#D8D0C4` | Hairline dividers, fields, inactive thumbnails. |
| `--color-muted` | `#625F59` | Secondary copy; use only at AA contrast. |
| `--color-terracotta` | `#A34D2D` | One primary CTA, active text link, price emphasis when necessary. |
| `--color-terracotta-hover` | `#823C24` | Interactive hover/pressed state only. |
| `--color-terracotta-soft` | `#F2E0D6` | Selected state or quiet utility background only. |
| `--color-success` | `#28623F` | Genuine successful/available confirmation only. |
| `--color-warning` | `#9A5C13` | Time-sensitive low stock or warning only. |
| `--color-danger` | `#A7352A` | Errors and out-of-stock only. |

Rules:

- Do not use slate, amber, emerald, or red as decorative component palettes.
- Do not create separate coloured badges for campaigns, “trending,” categories, craftsmanship claims, or ratings.
- Terracotta is reserved for the primary purchase action, an active text link, and one price emphasis. It never colours a headline, divider, static icon, or hero decoration.
- The primary dark surface is ink, not a competing blue-black slate.

### Typography

Retain the locally available font pair to avoid a dependency or asset change:

| Role | Family | Weights | Use |
| --- | --- | --- | --- |
| Display | Pangram | 600, 700 | `h1`–`h3`, product names, concise editorial statements. |
| Body / UI | Red Hat Display | 400, 500, 600 | Body copy, navigation, product metadata, forms, buttons. |

| Style | Mobile | Desktop | Weight / line-height |
| --- | --- | --- | --- |
| Display XL | 2.5rem | 4.5rem | 700 / 0.98 |
| Display L | 2rem | 3.25rem | 700 / 1.04 |
| Heading M | 1.5rem | 2rem | 700 / 1.15 |
| Heading S | 1.25rem | 1.5rem | 600 / 1.25 |
| Body L | 1.125rem | 1.25rem | 400 / 1.6 |
| Body | 1rem | 1rem | 400 / 1.6 |
| UI | 0.875rem | 0.875rem | 600 / 1.35 |
| Eyebrow | 0.6875rem | 0.75rem | 600 / 1.2, uppercase, `0.12em` tracking |

Rules:

- No `font-black`; use contrast from size and spatial placement instead.
- Restrict an all-caps eyebrow to one per section. Buttons should be sentence case.
- Product cards use a 1rem/600 product name and 0.875rem/600 price; they must not imitate a page heading.
- Body copy may use `--color-muted`, but introductory and product-description copy should use ink at a calmer weight rather than low-contrast grey.

### Spacing, layout, shape, and elevation

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | 0.25rem | Inline icon/text adjustments. |
| `--space-2` | 0.5rem | Tight metadata relationships. |
| `--space-3` | 0.75rem | Controls, list gaps. |
| `--space-4` | 1rem | Default internal rhythm. |
| `--space-6` | 1.5rem | Component gap / mobile section detail. |
| `--space-8` | 2rem | Section header to content. |
| `--space-12` | 3rem | Mobile section block. |
| `--space-16` | 4rem | Desktop section block. |
| `--space-24` | 6rem | Major editorial transition. |

- **Container:** `max-width: 80rem`; side padding 1rem on compact screens, 1.5rem at `sm`, 2.5rem at `lg`, 4rem at `xl`. Product/detail pages can use the same container so their alignments are stable.
- **Section rhythm:** `py-12` mobile / `py-16` desktop as the normal interval; only the hero and pre-footer need `py-16` / `py-24`.
- **Radii:** 0 for prose, rules, list rows, and layout bands; 0.5rem for fields and buttons; 0.75rem for image frames and product cards; `9999px` only for filter chips, icon-only controls, or real status counters.
- **Elevation:** none at rest for content; one `0 8px 24px rgb(28 33 29 / 0.08)` shadow for modal/drawer overlays only. Products use a thin rule, never hover elevation.
- **Motion:** 160ms colour/border transitions for controls; 240ms opacity/height for accordions; 300ms opacity only for hero changes. Respect `prefers-reduced-motion`. Remove generic `transition-all`, scale, lift, and shadow animations.

### Accessibility and responsive baseline

- Maintain the existing `1rem` minimum font size for text inputs, textareas, and selects.
- Retain full-size tap targets (minimum 44px) without replacing every action with a pill.
- On mobile, convert the product grid to two compact media-led columns; retain category/filter rows as a horizontally scrollable list, not wrapped pills.
- Keep product title, price, and add-to-cart visible before nonessential proof; defer related products and testimonials below the fold.
- Ensure text on paper/surface meets AA contrast; test terracotta only for large text or against white when used as a filled control.

## Approval gate

No component, route, data, or business-logic changes have been made. After approval, the next document will turn this direction into the requested component-level fix list and section-by-section rebuild plan before implementation begins.
