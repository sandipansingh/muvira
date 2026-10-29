# Design system

The canonical visual tokens live in `client/src/index.css` and `client/tailwind.config.js`. Reuse those tokens instead of duplicating their raw values.

## Typography

- Storefront `font-display`, `font-serif`, `font-sans` and `font-product` all resolve to locally hosted Inter, variable 100–900. Headings use semibold without synthesized faces.
- Page titles are 28px desktop/24px phone, panel headings 18px, section headings 24px and homepage hero 40px/32px. Body/product text is 14px/20px; metadata is 12–13px.
- Inputs, textareas and selects render at least 16px. All targets remain at least 44px.
- Font/type variables in `client/src/index.css` feed the Tailwind adapters. No independent raw colour or font system belongs in components.
- Administration explicitly retains Manrope and its established heading/table/field geometry. The Muvira wordmark retains DM Serif Display as brand artwork via `--font-brand` only.
- Font sources and SIL licenses live in `client/public/fonts/`; the entry document preloads Inter.

## Color

- Use semantic tokens such as `paper`, `surface`, `ink`, `ink-soft`, `muted`, `line`, `primary`, `accent`, `danger`, `warning`, `info`, and `rating`.
- Primary brand color is for interactive CTAs, active controls, prices, and hover states. It is not a static heading or decorative-icon color.
- Summary and overview copy uses high-contrast `ink`/`neutral-900`, not muted text.
- Use danger, warning, info, and accent tokens only when their state meaning is accurate.
- Do not add raw hex, RGB, or HSL values to JSX or component CSS.

## Shape, elevation, and layout

- Use the established `control`, `card`, `image`, `pill`, and responsive rounded utilities.
- Nested radii should not exceed their parent radius.
- Use subtle `xs`, `sm`, `card`, `premium`, or `overlay` shadows; avoid heavy elevation and decorative borders.
- Use `layout-container` or `editorial-container` for page width and responsive gutters.
- Prefer established gap/spacing utilities over arbitrary one-off values.
- Logo assets never receive a surrounding frame, background, border, or shadow.

## Components

- Multi-level navigation uses `Breadcrumbs` with chevron separators.
- Interactive selectors use the animated `Dropdown` rather than native selects unless native behavior is specifically required for accessibility.
- Multi-page listings use `Pagination` and scroll back to the results container after navigation.
- All controls need visible focus states, accessible names, and truthful disabled/loading behavior.
