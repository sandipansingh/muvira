# Muvira design system

The executable sources of truth are `client/src/index.css`, `client/tailwind.config.js`, and the shared components under `client/src/components/ui/` and `client/src/components/common/`. The concise contribution rules are in `.claude/rules/design_system.md`.

## Foundations

- Display/headings: Raleway through `font-display`
- Body and controls: Lato through `font-sans`
- Page surfaces: `paper`, `surface`, and `surface-alt`
- Text: `ink`, `ink-soft`, and `muted`
- Boundaries: `line`, `field-border`, and `disabled`
- Actions: `primary` and `primary-hover`
- State: `accent`, `danger`, `warning`, `info`, and `rating`, with matching soft tokens where defined

Use the semantic class or CSS variable. Do not copy its raw value into JSX or component CSS.

## Usage rules

- Primary brand color is reserved for actions, selected controls, prices, and hover states.
- Success uses accent; errors use danger; caution uses warning; neutral status information uses info.
- Heading line-height is at least 1.15. Body text uses comfortable readable leading.
- Form controls use a font size of at least 16px.
- `layout-container` and `editorial-container` provide canonical page width and gutters.
- Reuse `Button`, `Input`, `Textarea`, `Badge`, `Breadcrumbs`, `Dropdown`, `Pagination`, `Modal`, `RatingStars`, and existing state components.
- Logo images have no decorative frame, background, border, or shadow.
- Loading, empty, error, disabled, and success states must state the real application condition.

If a new token or primitive is genuinely necessary, define it in the executable token/component source first and update this document in the same change.
