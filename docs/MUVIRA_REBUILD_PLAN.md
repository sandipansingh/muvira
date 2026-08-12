# Muvira Storefront: Approved Structural Rebuild Plan

**Status:** Planning approved in principle; stop before component implementation

## Guardrails

- This plan changes presentation, component composition, and Tailwind styling only.
- Do not change API routes, data fetching, cart/auth/checkout behaviour, or product schemas.
- Keep the palette, type scale, spacing, radius, and motion rules in [the audit and token proposal](./MUVIRA_VISUAL_AUDIT_AND_TOKENS.md).
- Match the reference project’s section structure and content density—not its travel copy, images, colour values, or components.
- Preserve the existing responsive breakpoints; all sections begin as single-column mobile layouts.

## Homepage sequence

The homepage must be reordered to this exact flow:

1. Hero
2. Category/theme strip
3. Featured products
4. Value propositions
5. Testimonials
6. FAQ
7. Footer

`PromoGrid` is removed from the homepage sequence. `CraftsmanshipStory` is not a homepage section in this phase; its workshop narrative can be reused on a future brand/about surface only after a route is approved.

## 1. Hero

**Source:** `client/src/components/home/HeroSlider.tsx`

Adapt the reference hero’s single-message composition:

- One small collection/context label, one display headline, one supporting sentence, and one primary “Shop collection” CTA.
- One image-led media panel. Select a single crop with room for the text block; do not use floating product cards, avatar proof, star rows, or a “Trending” badge.
- Retain slide functionality only when real hero slides are present. The visible slide contains one CTA. Dot navigation may remain as the sole carousel control when there is more than one slide.
- Mobile: text first, media second, with a 4:3 or 5:4 crop. Desktop: two-column composition with generous empty space.
- Interaction: CTA changes terracotta tone only; carousel media uses the approved opacity transition. No scale, shadow lift, or animated secondary controls.

## 2. Category/theme strip

**Source:** `client/src/components/home/CategoryGrid.tsx`

Model this on the reference’s category/destination strip:

- Header row: `Shop by category` and one quiet text link to the shop.
- Use a compact image-first row/grid. Each category has a single crop, name, and optional product count; remove “Shop now” copy and decorative arrow circles.
- Desktop: four strong categories in equal columns, prioritising the actual inventory categories. Mobile: horizontally scrollable image tiles with snap alignment; do not wrap six small cards into a dense grid.
- Category links can use only an image crop scale or title colour change, never card translation, shadow elevation, arrow inversion, and image scaling together.

## 3. Featured products

**Sources:** `client/src/components/home/BestSellers.tsx`, `client/src/components/catalog/ProductCard.tsx`

Model this on the reference’s featured card grid:

- Header row: eyebrow `Featured pieces`, display heading, and a quiet `View all products` text link. Do not use “deals” language unless the underlying data establishes a real sale.
- If category filters remain, they form one small horizontal filter row beneath the heading; the active chip is ink, not terracotta.
- Products remain the only card-like units. Product card hierarchy is image, category metadata, product name, price, then unobtrusive action.
- Remove card padding around the entire grid item where it creates a second image frame; retain one restrained image surface and a hairline product boundary.
- Remove hover lift, hover shadows, quick-view prominence, decorative in-stock treatment, and nonessential discount badges. Retain a discount indicator only when `discountPercent > 0` and make it compact, factual, and non-pill.
- Mobile: two product columns; the image and name remain legible before any secondary action.

## 4. Value propositions

**Replace:** `client/src/components/home/TrustBadges.tsx` and the value-proposition grid within `CraftsmanshipStory.tsx`

Mirror the reference’s `WhyChooseUs` layout structurally:

- Section header: one eyebrow, heading, and one sentence, centred on desktop and left-aligned on mobile.
- Exactly three values: icon, concise heading, one supporting sentence. Proposed content: `Made with care`, `Delivery you can plan for`, and `Built for everyday life`.
- No card wrapper, background tile, border, shadow, stat counter, badge, or hover animation.
- Desktop: three equal columns with centred content. Mobile: three simple horizontal icon-and-copy rows separated by hairline rules.
- Use line icons in ink; terracotta is not used here.

## 5. Testimonials

**Replace:** `client/src/components/home/TestimonialSection.tsx`

Mirror the reference’s testimonial structure with ecommerce content:

- Header row: a small eyebrow, section heading, and a quiet `See all reviews` text link aligned at the end of the row.
- Testimonials are a horizontally scrollable row of plain text blocks. Each block contains only the customer name and quote; location is optional supporting metadata when available.
- Remove card borders, fills, shadows, quote-icon decoration, avatars, star-rating badge, and verified-review/buyer pills.
- Desktop: three visible blocks divided by vertical hairline rules. Mobile: an overflow row where each block is at least 80% of the viewport width, with no card chrome.
- The only interaction is the header link. The testimonial blocks do not animate or elevate.

## 6. FAQ

**New homepage component:** `client/src/components/home/FaqSection.tsx`

Mirror the reference FAQ layout exactly, adapted to Muvira:

### Header and help row

- Begin with the eyebrow `FAQ` above a display heading such as `Questions, answered plainly.`
- Place a supporting help column beside the header on desktop and below it on mobile. Its required message is: `Didn't see your question?` followed by a text link to the full FAQ page and a `reach out to us` contact link.
- The planned FAQ-page link must not be rendered until a real FAQ route is separately approved; the current application has no `/faqs` route. Do not introduce a broken link. During this first homepage-only phase, retain the contact link and reserve the `See all FAQs` link for the later route.
- The contact action uses the existing support email or phone destination—not a new contact route, which does not currently exist.

### Body

- Place one supporting image alongside the accordion on desktop; it becomes a full-width, fixed-aspect image above the list on mobile. Use a single workshop/material/home image from the supplied ecommerce direction.
- The accordion begins with every answer closed. Each item is a plain question row with a right-aligned chevron and a hairline bottom rule; it has no rounded container, filled background, card shadow, or per-question image.
- Opening one item reveals the answer below its rule and rotates the chevron. Use one 240ms height/opacity animation and preserve `aria-expanded` behaviour.
- Initial ecommerce questions: delivery zones and timings; tracking an order; returns and exchanges; dimensions and sizing; material care; payment methods; installation/assembly; warranty; and made-to-order lead times. Exact answers must be supplied or approved before implementation; no claims will be invented in the component.
- Mobile: header, help copy, image, then accordion. Desktop: header/help row above a 5/7 image-to-accordion grid.

## 7. Footer

**Replace:** `client/src/components/layout/Footer.tsx`

Mirror the reference footer’s practical four-column information architecture on the proposed muted warm surface:

| Column | Content | Source / constraint |
| --- | --- | --- |
| Brand and contact | Muvira wordmark, short brand description, email, phone, address. | Existing site settings. No framed logo or social-icon gallery. |
| Quick links | Shop, cart, account, orders, and the on-page FAQ anchor. | Existing routes plus `/#faq`. |
| Popular highlights | Current category links such as living room, bedroom, dining, office and decor. | Existing category routes only. |
| Newsletter | Heading, one email input, and a submit affordance. | Layout may be added, but submission must use an existing approved newsletter capability. None was identified in the current client services; no endpoint, subscription service, or mock success state is created in this UI pass. |

- Remove the current large pre-footer studio/contact campaign block so the footer has one clear hierarchy.
- Desktop: four columns, with brand/contact receiving the broadest column. Mobile: brand/contact, newsletter, quick links, then popular highlights; each group is separated by a simple rule.
- Links use ink with a colour-only hover. The newsletter field follows the token proposal and retains the existing 1rem input size rule.
- Keep payment reassurance as a quiet legal/footer line, not a separate promotional panel.

## Component and data boundary map

| Change | UI files affected | Data / business boundary |
| --- | --- | --- |
| Homepage composition | `HomePage.tsx` | Reorders components only. |
| Hero simplification | `HeroSlider.tsx` | Continue consuming existing hero slide settings; no new query. |
| Category/product visual treatment | `CategoryGrid.tsx`, `BestSellers.tsx`, `ProductCard.tsx` | Continue existing category/product service calls. |
| Value props | New/renamed presentational homepage component | Static UI copy only; no backend change. |
| Testimonials | `TestimonialSection.tsx` | Continue using the existing testimonial content source until a real review feed is already available. |
| FAQ | New `FaqSection.tsx` | Use approved static copy or an already available settings content source only. No FAQ API or route in this phase. |
| Footer | `Footer.tsx` | Continue contact/settings reads. Newsletter handling is deferred unless an existing approved client capability is confirmed. |

## Explicit deferrals

- No `/faqs` route is created in this phase. A full FAQ page is required before the header’s “See all FAQs” link can be activated.
- No privacy, terms, cancellation, cookie, or other policy route/page is created in this phase.
- No newsletter endpoint, persistence, or new service is created. The newsletter column’s form behaviour must wait for an approved existing integration or a separate backend task.
- No component implementation starts until this plan is reviewed.
