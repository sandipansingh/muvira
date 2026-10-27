# Muvira editorial identity

Muvira is an English-language Indian storefront for god idols, puja products and home pieces. Large, faithful product photography and generous space support thoughtful browsing; operational screens use compact, legible controls.

The approved redesign replaces the previous type and color direction. Runtime CSS in `client/src/index.css` is authoritative (ownership model B). `client/tailwind.config.js` adapts those variables; shared components consume the semantic classes. `DESIGN_SYSTEM.md` documents implementation and `UX-CONTRACT.md` records behavior.

## Tokens and mapping

| Intent | Runtime owner | Accepted value | Consumers |
| --- | --- | --- | --- |
| Warm white canvas | `--background` | `#FAF8F4` | Page shells |
| White surface | `--color-paper` | `#FFFFFF` | Controls, panels |
| Stone | `--surface-alt`, `--color-line` | `#E9E3D9` | Footer, borders |
| Charcoal | `--color-ink` | `#1F2521` | Headings, text |
| Muted green-grey | `--color-muted` | `#657168` | Secondary copy |
| Deep green | `--color-primary` | `#334B42` | Actions, prices, selected controls |
| Display face | `--font-display` | DM Serif Display, regular 400 | Editorial headings |
| Utility face | `--font-sans`, `--font-product` | Manrope, variable 200–800 | Body, products, prices, admin |
| Layout | `.layout-container`, `.editorial-container` | 1320px maximum, responsive gutters | Storefront pages |
| Shape | `--radius-control`, `--radius-card` | 8px, 12px | Shared controls and panels |

## Composition

The signature is a quiet 40/60 split hero with a real idol in a stone mandir setting. Mobile stacks copy and photography. Category imagery uses shallow arched tops. Four-column merchandise grids reduce to three on tablets and two on phones, then one below 360px. Product images retain complete silhouettes. Modest radii, fine borders, and restrained overlay shadows keep attention on the merchandise.

DM Serif Display uses no synthesized bold or italic. Manrope supports the rupee sign. Full licensed font files are self-hosted. Admin headings use Manrope. The unframed original Muvira logo remains unchanged.

## Evidence and imagery

`client/public/images/editorial/README.md` records source photographs, prompts, and review. A reviewed composite is selected only when its exact source photograph remains configured. New or changed content uses its own image. Unconfigured content uses an empty atmospheric setting and the approved generic hero; it never introduces products, prices or sales claims.

## Verification

The existing commerce regression tests remain authoritative for behavior. The responsive suite adds isolated authenticated customer and admin fixtures, all 23 pages, protected-route guest checks, keyboard interactions, overlays, reduced motion and enlarged text. Screenshots are development evidence under `responsive-audit/redesign/`.
