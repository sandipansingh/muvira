# Muvira storefront visual refresh

## Direction

The customer storefront uses a quiet editorial atelier direction: warm paper surfaces, near-black structure, cognac as a restrained action accent, oversized Pangram display type, and fine rules in place of elevated card stacks.

## Decisions

- A full customer-facing storefront refresh was selected over a shell-only pass.
- The visual system is token-led so the homepage, catalog, product, cart, checkout, account, and order surfaces share the same paper/ivory/ink/rule language.
- Pangram is reserved for display type and Red Hat Display is used for body copy, navigation, metadata, and forms.
- The bundled Pangram OTF assets are the active display font sources. Roboto, serif fallbacks, and missing Pangram WOFF2 aliases are no longer active.
- Light-first surfaces are the default. Charcoal is limited to structure, text, announcement state, and primary actions.
- Radii and shadows are restrained. Pills are limited to compact controls/status labels, while primary layout surfaces use borders and whitespace.
- Motion is purposeful: carousel opacity, drawers, modals, accordions, and short state feedback remain available. Reduced-motion users receive near-zero-duration transitions and animations.
- The footer uses API-backed contact settings for real `mailto:` and `tel:` actions. It does not include a newsletter form, invented social links, or unsupported legal routes.
- Existing routes, API contracts, authentication, cart merging, checkout, Razorpay verification, orders, reviews, profile, and address behavior remain unchanged.

## Surface notes

- Hero media is flat and paired with an editorial caption panel; pagination is line-based and controls remain visible.
- Category and product grids use static crops, captions, rules, and visible actions without hover zoom or elevation.
- Product detail galleries use quiet borders and explicit active thumbnails.
- Testimonials are rule-separated quotes on paper/ivory surfaces.
- Craftsmanship is a split editorial composition with a restrained principles strip.
- Trust content remains static and is presented as a factual rule-based strip.
- Cart, checkout, auth, profile, and order states use the same form, status, error, loading, and summary primitives.

## Verification

The refresh was checked with:

- `npm run lint:fix`
- `npm run format`
- `npm run build`
- `graphify update .`

The full client and server build completes successfully. Graphify was rerun with repository-local write permission after the sandbox extractor initially returned `Operation not permitted`.
