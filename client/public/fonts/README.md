# Custom Fonts

Place the following font files in this directory (as WOFF2).

All `@font-face` declarations in `src/index.css` reference these exact filenames.

## Required Files

| CSS font-family            | Filename in this folder             | Format     | Source / Notes |
|----------------------------|-------------------------------------|------------|----------------|
| red_hat_displayregular     | red_hat_display_regular.woff2       | WOFF2      | Google Fonts - Red Hat Display Regular (400) |
| red_hat_displaymedium      | red_hat_display_medium.woff2        | WOFF2      | Google Fonts - Red Hat Display Medium (500) |
| red_hat_displaybold        | red_hat_display_bold.woff2          | WOFF2      | Google Fonts - Red Hat Display Bold (700) |
| robotoregular              | roboto_regular.woff2                | WOFF2      | Google Fonts - Roboto Regular (400) |
| robotomedium               | roboto_medium.woff2                 | WOFF2      | Google Fonts - Roboto Medium (500) |
| pangramregular             | pangram_regular.otf                 | OTF        | Pangram Sans (Compact Regular) - trial from Pangram Pangram Foundry (free-to-try) |
| pangrambold                | pangram_bold.otf                    | OTF        | Pangram Sans Bold - trial from Pangram Pangram Foundry (free-to-try) |
| Abhaya Libre               | abhaya_libre_regular.woff2          | WOFF2      | Google Fonts - Abhaya Libre |
| Annapurna SIL              | annapurna_sil_regular.woff2         | WOFF2      | Google Fonts - Annapurna SIL |

> **Pangram note:** This is a trial/preview version of "Pangram Sans" from https://pangrampangram.com (free to try for testing). For production use, purchase a proper license from the foundry.
>
> The @font-face rules prefer .woff2 if you add optimized WOFF2 versions later (just drop `pangram_regular.woff2` and `pangram_bold.woff2` alongside the .otf files).

## Usage via Tailwind

```html
<!-- Red Hat Display -->
<span class="font-redhatRegular">Regular</span>
<span class="font-redhatMedium">Medium</span>
<span class="font-redhatBold">Bold</span>

<!-- Roboto -->
<span class="font-robotoRegular">Regular body</span>
<span class="font-robotoMedium">Medium body</span>

<!-- Pangram (accent / CTAs) -->
<span class="font-pangramRegular">Accent</span>
<span class="font-pangramBold">Bold accent</span>

<!-- Vernacular -->
<span class="font-abhaya">Abhaya Libre</span>
<span class="font-annapurna">Annapurna SIL</span>
```

## Notes

- Use WOFF2 for best performance.
- The system is designed so that each weight has its own `font-family` name (no reliance on `font-weight` numbers).
- Default body uses `robotoregular`.
- Headings, navigation, buttons and product titles use `red_hat_displaymedium`.
- Marketing / sale CTAs and labels should use `pangram*` families.
- Build will succeed even if files are missing (fonts will gracefully fallback).
