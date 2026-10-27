# Muvira immersive heritage identity

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
| Muted brass decoration | `--color-brass` | `#98753A` | Fine rules, restrained heritage details |
| Image hover | `--duration-image`, `--scale-image-hover` | 350ms, 1.06 | Browsable cards on fine pointers only |
| Display face | `--font-display` | DM Serif Display, regular 400 | Editorial headings |
| Utility face | `--font-sans`, `--font-product` | Manrope, variable 200–800 | Body, products, prices, admin |
| Layout | `.layout-container`, `.editorial-container` | 1320px maximum, responsive gutters | Storefront pages |
| Shape | `--radius-control`, `--radius-card` | 8px, 12px | Shared controls and panels |

## Composition

The signature is a continuous, full-width stone mandir photograph, with generous copy space on the left and a prominent faithful idol on the right. The compact ivory header floats over the home scene and stays in normal flow on interior pages. Its sticky geometry is stable. Separate portrait compositions put copy above the deity on phones. Category discovery uses compact circular photographic medallions, merchandise uses larger filled 4:5 images, configured campaigns alternate image scale and alignment, and the store story separates merchandise from support.

Catalog grids use four desktop, three tablet, two mobile columns, then one below 360px. Filled category and campaign photography shares the browsable-image treatment: 1.06× over 350ms only on fine-pointer hover/focus with no reduced-motion preference. Actions remain visible on touch and keyboard. Square commerce thumbnails use the same image-failure presentation. Logos retain their original proportions and receive no zoom treatment.

Product detail uses approximately 58/42 gallery/purchase columns. The uncapped 4:5 gallery contains complete photographs at rest, horizontal thumbnails, and in-frame fine-pointer zoom. The shared modal lightbox provides previous/next, 1×/2×, reset, drag and labeled pan buttons, arrow-key controls, Escape and focus restoration. Search places its labeled query, result count, removable filter chips, sort and products together; URL state remains authoritative.

DM Serif Display uses no synthesized bold or italic. Manrope supports the rupee sign. Full licensed font files are self-hosted. Admin headings use Manrope. The unframed original Muvira logo remains unchanged.

## Evidence and imagery

`client/public/images/editorial/README.md` records all three source photographs, desktop/mobile prompts, optimization and fidelity review. A reviewed composite is selected only when its exact source photograph remains configured. New or changed content uses its own image. Unconfigured content uses an empty atmospheric setting and the approved generic hero; it never introduces products, prices or sales claims.

## Verification

The existing commerce regression tests remain authoritative for behavior. The responsive suite adds isolated authenticated customer and admin fixtures, all 23 pages, protected-route guest checks, keyboard interactions, overlays, reduced motion and enlarged text. Screenshots are development evidence under `responsive-audit/redesign/`.
