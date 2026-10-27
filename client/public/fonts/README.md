# Local fonts

The approved editorial redesign uses full, unmodified font files from the official Google Fonts repository, downloaded 2026-10-27:

- `DMSerifDisplay-Regular.ttf`: [DM Serif Display](https://github.com/google/fonts/tree/main/ofl/dmserifdisplay), regular 400. Editorial headings disable font synthesis.
- `Manrope-Variable.ttf`: [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), variable 200–800. Used for body, controls, products, prices and admin. Includes the Indian rupee sign.

Both families use the SIL Open Font License 1.1. Their unmodified licenses are included as `dmserifdisplay-OFL.txt` and `manrope-OFL.txt`. CSS uses `font-display: swap` and the entry document preloads both faces.
