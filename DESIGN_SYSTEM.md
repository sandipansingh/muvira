# Muvira Design System — Source of Truth

This file is the ONLY reference for colors, spacing, and shared components.
Any color, radius, or shadow NOT listed here must not be used.
If you need a new value, add it here first, then use it — never inline a hex/rgba value in a component.

## Status
- **Active system:** Clean monochrome tokens (no "kit" prefix)
- **Deprecated:** `--brand`, `--color-terracotta`, `--brand-hover`, `--brand-light`, `--brand-dark`, `.editorial-*` classes, `theme-dark`/`theme-card`/`theme-badge-green`/`theme-muted`/`theme-border` in `tailwind.config.js`
  → Do not use deprecated tokens in new or edited code. Migrate them out when touched.

---

## Color Tokens

*Use these Tailwind classes only — never raw hex/rgba, never default Tailwind grays.*

| Semantic use | Tailwind class | CSS Variable / Value |
|---|---|---|
| Page background | `bg-paper` | `var(--color-paper)` (`#fefefe`) |
| Card / surface background | `bg-surface` | `var(--color-surface)` (`#f3f5f7`) |
| Primary text | `text-ink` | `var(--color-ink)` (`#141718`) |
| Secondary text | `text-ink-soft` | `var(--color-ink-soft)` (`#232627`) |
| Muted / helper text | `text-muted` | `var(--color-muted)` (`#6c7275`) |
| Border / divider | `border-line` | `var(--color-line)` (`#e8ecef`) |
| Input border | `border-field-border` | `var(--color-field-border)` (`#b8bdc0`) |
| Disabled | `text-disabled` / `bg-disabled` | `var(--color-disabled)` (`#aeb5c3`) |
| **Primary Brand** | `text-primary` / `bg-primary` | `var(--color-primary)` (`#a24e31`) |
| Primary Hover | `hover:bg-primary-hover` / `hover:text-primary-hover` | `var(--color-primary-hover)` (`color-mix(in srgb, var(--color-primary), black 18%)`) |
| Primary Soft Background | `bg-primary-soft` / `text-primary-soft` | `var(--color-primary-soft)` (`color-mix(in srgb, var(--color-primary), white 88%)`) |
| Primary Border | `border-primary` | `var(--color-primary)` (`#a24e31`) |
| Accent (success/CTA) | `bg-accent` / `text-accent` | `var(--color-accent)` (`#38cb89`) |
| Accent soft background | `bg-accent-soft` | `var(--color-accent-soft)` (`#e8f8f0`) |
| Danger | `text-danger` / `bg-danger` | `var(--color-danger)` (`#e53935`) |
| Danger soft background | `bg-danger-soft` | `var(--color-danger-soft)` (`#fdeeed`) |
| Warning | `text-warning` / `bg-warning` | `var(--color-warning)` (`#d97706`) |
| Warning soft background | `bg-warning-soft` | `var(--color-warning-soft)` (`#fef3c7`) |
| **Info** (new) | `text-info` / `bg-info` | `var(--color-info)` (`#2F6FED`) |
| Info soft background | `bg-info-soft` | `var(--color-info-soft)` (`#edf4fe`) |
| **Rating** (new, exception) | `text-rating` / `fill-rating` | `var(--color-rating)` (`#F5A623`) |
| Pure white / black (overlays only) | `white` / `black` | `#ffffff` / `#000000` |

### Where Primary Brand Color applies:
- **Sale & discount badges** ("Save 50%", discount tags): `bg-primary text-white` (was `bg-accent`/green)
- **Urgency / dispatch copy** ("Dispatch within 24 Hours", stock countdowns): `text-primary` on `bg-primary-soft` (was light green)
- **Text selection highlight**: `::selection { background: var(--color-primary-soft); }` (was `accent-soft` mint)
- **Link hover accent** (in-page content links, "reach out", breadcrumbs): `text-ink hover:text-primary hover:underline underline-offset-2`
- **Focus rings on inputs**: `focus:border-primary` (was `focus:border-ink`)
- **Section eyebrows / small accent underlines on headings**: may use `bg-primary` for decorative underline bars

### Where it does NOT apply (stays as-is):
- Success states (order confirmed, coupon applied, in-stock badge) stay `accent` green (`#38cb89`).
- Danger/warning/info remain unchanged.

### Documented Exceptions
- **Star Rating Icons**: Use `text-rating` / `fill-rating` (`#F5A623`) — gold is intentional, not a token violation.
- **Google OAuth SVG Icon**: Uses official Google brand hexes (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) — third-party brand marks are exempt from the token system by design.

---

## Shared Components (Must be used — no one-off markup)

### `<Button>`
Props: `variant: "primary" | "secondary" | "ghost" | "inverse"`, `size: "xs" | "sm" | "md" | "lg" | "xl"`
- `primary`: `bg-primary text-white hover:bg-primary-hover` (was bg-ink — carrying primary brand color)
- `secondary`: `bg-white border border-line text-ink hover:border-field-border`
- `ghost`: `text-ink hover:bg-surface`
- `inverse`: `bg-white text-ink hover:bg-surface` (for hero/dark overlay backgrounds)

*No component may hand-roll button classes. If a new variant is needed, add it to `<Button>`, not inline.*

### `<Link>` (for in-page redirectable/interactive text, not nav logos)
Single hover rule for all body/content links: `text-ink hover:underline underline-offset-2`  
*No color-only hover, no underline-only-sometimes. One behavior everywhere.*

### `<Badge>`
Props: `tone: "neutral" | "success" | "danger" | "warning" | "info"`

### `<Input>`
Single canonical style: `bg-white border-field-border text-ink placeholder:text-muted focus:border-ink`

### `<Breadcrumbs>`
Modeled after the Product Detail page standard.
Props: `items: { label: string; href?: string }[]`, `className?: string`
- Structure: `nav aria-label="Breadcrumb"` with `flex flex-wrap items-center gap-1.5 text-xs text-muted`.
- Separators: `ChevronRight` (`h-3 w-3 text-muted`).
- Inactive links: `text-muted hover:text-primary transition-colors`.
- Terminal active item: `text-ink truncate font-normal` with `aria-current="page"`.

### `<Dropdown>`
Framer Motion animated interactive dropdown menu for sorting, category switching, and custom filters.
Props: `options: DropdownOption[]`, `value: string`, `onChange: (val: string) => void`, `variant?: "default" | "slim"`, `placeholder?: string`, `label?: string`, `align?: "left" | "right"`
- Spring animations (`opacity`, `scale`, `y`).
- Viewport collision awareness (auto-flips upwards if bottom room < 260px).
- Click-outside auto closing.

### `<Pagination>`
Borderless background-level pagination with 4 chevrons and smart ellipsis windowing.
Props: `currentPage: number`, `totalPages: number`, `onPageChange: (page: number) => void`
- Controls: `ChevronsLeft`, `ChevronLeft`, `ChevronRight`, `ChevronsRight`.
- Active page: `bg-primary text-white font-normal shadow-sm scale-105 hover:bg-primary-hover`.
- Inactive page: `text-ink hover:bg-surface`.
- Pair with `resultsContainerRef` and `shouldScrollRef` for smooth scrolling to results on page transition.

---

## Typography Scale

| Token | Font | Weight | Size | Line Height |
|---|---|---|---|---|
| `h1` | `font-display` | 700 | `clamp(2.25rem, 3.75rem)` | 1.04 |
| `h2` | `font-display` | 700 | `clamp(1.75rem, 2.5rem)` | 1.15 |
| `h3` | `font-display` | 700 | `1.5rem` (24px) | 1.2 |
| `h4` | `font-display` | 700 | `1.25rem` (20px) | 1.25 |
| `body` | `font-sans` | 400 | `1rem` (16px) | 1.6 |
| `body-sm` | `font-sans` | 400 | `0.875rem` (14px) | 1.5 |
| `caption` | `font-sans` | 500 | `0.75rem` (12px) | 1.4 |
| `eyebrow` | `font-sans` | 600 | `0.6875rem` (11px), uppercase, tracking `0.12em` | 1.2 |

*Any heading/body combination not in this table must be replaced with the closest match, not preserved.*

## Compact Storefront Density

The storefront uses a compact-balanced rhythm across catalog, product, cart, checkout, profile, and order surfaces.

| Token | Value | Use |
|---|---:|---|
| Content max width | `1600px` | Shared layout and editorial containers |
| Page title | `clamp(2rem, 3vw, 3rem)` | Storefront page-level headings |
| Product title | `clamp(1.75rem, 2.6vw, 2.5rem)` | Product detail and quick-view titles |
| Standard control | `40px` | Default buttons and compact selects |
| Large control | `44px` | Primary purchase and checkout actions |
| Card padding | `20–24px` | Panels, summaries, and content cards |
| Layout gaps | `16–24px` | Grid, card, and section content |

Inputs retain a minimum `16px` font size for mobile accessibility, and interactive controls retain touch-usable dimensions.
