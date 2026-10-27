# Design system

The canonical visual tokens live in `client/src/index.css` and `client/tailwind.config.js`. Reuse those tokens instead of duplicating their raw values.

## Typography

- Sawarabi Mincho (`font-display` / `font-serif`, `--font-display`) is used for page/section headings and display labels. It has only regular (400); do not synthesize bold or italic.
- Roboto (`font-sans`, `--font-sans`) is used for body copy, navigation, forms, buttons, and control labels.
- Open Sans (`font-product`, `--font-product`) is used for product names and standalone prices, including sale prices and order totals. Prices within control labels retain Roboto.
- Font variables in `client/src/index.css` feed `theme.extend.fontFamily` in `client/tailwind.config.js`; product typography selectors must respect the product family.
- Fonts are locally hosted WOFF2 with `font-display: swap`; Latin Extended subsets support accented text; ₹ uses the local Roboto fallback when absent in Open Sans. Sources and SIL licenses live in `client/public/fonts/`.
- Heading line-height must be at least 1.15 and normally uses tight letter spacing.
- Uppercase badges use `tracking-wider`; section eyebrows use the established wider tracking.
- Inputs, textareas, and selects render at `text-base` or larger to prevent iOS focus zoom.

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
