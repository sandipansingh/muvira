# WoodenStreet — Complete Design System Reverse Engineering

> **Site:** woodenstreet.com  
> **Stack:** Next.js (App Router) + Tailwind CSS v3.4.17 + CSS Modules (Emotion-style scoped naming) + Radix UI + Swiper.js  
> **Analysis Depth:** Pixel-level, token-exact, inferred from HTML snapshots, CSS bundles, and layout structure

---

## 1. BRAND PERSONALITY & DESIGN PHILOSOPHY

WoodenStreet operates as a **premium mass-market furniture ecommerce brand**. Its design DNA is:

- **Warm-premium, not cold-luxury** — The brand uses a muted orange-on-white palette that evokes craftsmanship, natural wood, and warmth without feeling expensive or exclusive.
- **Trust-first commerce** — Every UI decision prioritizes conversion confidence: social proof counters (20 Lakh+ customers), warranty badges, store count (81+), and review stars are pervasive.
- **Functional density, not minimalism** — The navigation mega-menu contains 100+ links. Product grids are tight. Real estate is never wasted.
- **Mobile-first with desktop polish** — The responsive strategy hides the desktop header entirely (`display: none`) on mobile and swaps to a mobile drawer nav. Desktop gets a fully-featured mega menu.
- **Indian market nuances** — Pricing in ₹ (Rupee), Hindi-origin product names (Sheesham wood, Manjiri bed), EMI callouts, and trust signals calibrated to Indian consumer skepticism.

---

## 2. TECHNICAL STACK (EXACT)

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Next.js (App Router) | `_next/static/css/`, `data-nimg`, Next.js chunked CSS naming |
| CSS Strategy | **Dual:** Tailwind CSS v3.4.17 + CSS Modules | `/* tailwindcss v3.4.17 */` comment + `.style_` prefix class names |
| Component Library | Radix UI Primitives | `data-radix-collection-item`, `radix-:R68kn6:` IDs, `data-state="active"` |
| Slider/Carousel | Swiper.js | `.swiper`, `.swiper-wrapper`, `.swiper-button-prev` classes |
| Icons | Custom inline SVG (no icon font) | All icons are inline `<svg>` elements |
| Image CDN | `images.woodenstreet.de` | All product images served from this domain |
| Animation | CSS transitions + custom `progressAnimation` keyframe | Slide indicator progress bars |

---

## 3. COLOR SYSTEM (COMPLETE TOKEN MAP)

### Primary Color — Brand Orange

The brand orange is a **warm amber-orange** (`#E37A34` / `rgb(227 122 52)`). It appears with multiple names that map to different tonal values across the system.

```
primaryBg          → #E37A34  (rgb 227 122 52)   — Primary brand action color
primary400         → #F9763A  (rgb 249 118 58)    — Slightly brighter variant
primary600         → #E85B1A  (rgb 232 91 26)     — Active/pressed state
primaryActive      → #E85B1A  (same as primary600)
primary200         → #FCAC8C  (rgb 252 172 140)   — Muted tint for borders
primary300         → #FA8D5E  (rgb 250 141 94)    — Mid-tone
primary100         → #FAE9E6  (rgb 250 233 230)   — Lightest tint / background wash

Hover orange (CSS): #E57200                        — Used in nav link hover, profile CTA
                   #E27A34  / #E27832              — Alternative spelling variants of brand orange
```

The star rating system uses `#E27A34` (slight variant) for filled stars, while the half-star uses a split fill technique (`fill="white"` on the right half path).

### Secondary Color Scale — Grays

The secondary system is a neutral gray ladder, all fully opaque values:

```
secondary200       → #E7E7E7  (rgb 231 231 231)  — Lightest borders, dividers
secondary300       → #D1D1D1  (rgb 209 209 209)  — Medium borders
secondary400       → #ACACAC  (rgb 172 172 172)  — Placeholder text, inactive icons
secondary500       → #8B8B8B  (rgb 139 139 139)  — Caption text
secondary600       → #646464  (rgb 100 100 100)  — Secondary body text
secondary700       → #515151  (rgb 81 81 81)     — Main body text
secondarytext      → #515151  (inferred same as secondary700)
darkColor          → #202020                     — Deepest text, almost-black
```

### Semantic Colors

```
successColor       → #4CAF4F  (rgb 76 175 79)   — Discount %, success states
dangerColor        → #F23433  (rgb 242 52 51)   — Error, out-of-stock
lightgrayColor     → #F5F5F5                    — Section backgrounds (store card, "new arrivals" strip)
```

### Background Tokens

```
Background (page)  → #FFFFFF
headerSection bg   → #FFFFFF
subMenu bg         → #FFFFFF
subMenucard (even) → #F9F9F9  — Alternating zebra stripe in mega menu
bg-[#FFF2F2]       → Soft pink promotional banner background
bg-home-gradient-three → Gradient used on mobile category tab strip
```

### Tailwind shadcn/Radix CSS Custom Properties (`:root`)

```css
--background: 0 0% 100%        /* HSL white */
--foreground: 0 0% 3.9%        /* Near-black */
--card: 0 0% 100%
--card-foreground: 0 0% 3.9%
--primary: 0 0% 9%
--primary-foreground: 0 0% 98%
--secondary: 0 0% 96.1%
--muted-foreground: 0 0% 45.1%
--border: 0 0% 89.8%           /* #e5e5e5 equivalent */
--radius: 0.5rem               /* Base radius variable */
```

---

## 4. TYPOGRAPHY SYSTEM

### Font Families

All fonts are loaded via custom `@font-face` declarations, not Google Fonts. The system uses distinct font names for each weight variant rather than `font-weight` integers.

| Family | Usage | CSS Font-Family Name |
|---|---|---|
| Red Hat Display | Primary UI font — navigation, headings, buttons, product titles | `red_hat_displayregular`, `red_hat_displaymedium`, `red_hat_displaybold` |
| Roboto | Secondary UI font — search, body copy, sign-in buttons | `robotoregular`, `robotomedium` |
| Pangram | Accent/marketing font — hero CTAs, sale labels | `pangramregular`, `pangrambold` |
| Abhaya Libre | Vernacular script font (Sinhala-origin) | `Abhaya Libre` |
| Annapurna SIL | Secondary vernacular/Devanagari font | `Annapurna SIL` |

### Tailwind Font Utility Classes (in HTML)

```
font-redhatRegular  → red_hat_displayregular
font-redhatMedium   → red_hat_displaymedium
font-pangramregular → pangramregular
```

### Type Scale

Inferred from Tailwind class usage in HTML:

| Name | Actual Size | Usage |
|---|---|---|
| `text-font10` | ~10px | Tiny captions, mobile category labels |
| `text-font11` | ~11px | Review count, micro-labels |
| `text-font12` | 12px | Icon labels in nav ("Stores", "Cart (0)") |
| `text-font13` | 13px | Sub-nav links, body micro-copy |
| `text-sm` | 14px | Body text, tab labels |
| `text-base` | 16px | Submenu category headers |
| `text-font19` | ~19px | Price display (current price) |
| `text-lg` | 18px | Section headings (mobile) |
| `text-2xl` | 24px | Section headings (desktop) |
| `text-4xl` | 36px | Stats emphasis ("81+") |

### Key Type Treatments

- **Heading style:** `font-redhatMedium tracking-wide text-secondarytext` — Section headings are medium-weight Red Hat Display, NOT bold.
- **Price current:** `text-secondarytext text-font19 font-redhatMedium` — uses dark gray, not black
- **Price strikethrough:** `text-secondary500 font-redhatRegular` — lighter gray, regular weight
- **Discount percent:** `text-successColor font-redhatMedium` — green, medium weight
- **Letter spacing:** `tracking-wide` is the default for most text. `tracking-wider` used on product tags and uppercase labels.
- **Line clamping:** Product titles always use `line-clamp-2` (exactly 2 lines). Section subheadlines use `line-clamp-1`.

---

## 5. SPACING SYSTEM

The site uses Tailwind's default 4px base scale, but reveals several hardcoded pixel values for specific legacy components:

### Standard Spacing (Tailwind 4px scale)
```
4px  → p-1, m-1, gap-1
8px  → p-2, m-2, gap-2
12px → p-3, m-3, gap-3
16px → p-4, m-4, gap-4
20px → p-5, m-5, gap-5
24px → p-6, m-6, gap-6
32px → p-8, m-8
40px → p-10, m-10
```

### Component-Specific Hardcoded Values
```
Header top padding:    30px (desktop), changes to 30px 40px on <1280px
Logo width:           244px (desktop), 190px (<1100px)
Search max-width:     500px (desktop), 360px (<1100px)
Search height:        40px (desktop), 35px (<1100px)
Nav item margin:      0 12px (horizontal), 0 8px (<1100px)
Profile dropdown:     width 230px, positioned left: -90px, top: 55px
Submenu card:         padding 20px 15px 15px
Submenu image:        min/max-width 295px, max-height 335px (<1100px: 227px × 325px)
Container max-width:  1240px (header), standard Tailwind breakpoints elsewhere
```

---

## 6. BORDER RADIUS SYSTEM

The site defines a custom named radius scale extending Tailwind's defaults:

```
rounded-xs / rounded-sm     → calc(0.5rem - 4px) = ~4px   [via --radius]
rounded-md                  → calc(0.5rem - 2px) = ~6px
rounded-lg                  → var(--radius) = 0.5rem = 8px
rounded-xl                  → 12px (Tailwind standard)
rounded-2xl                 → 16px
rounded-3xl                 → 24px

Custom named tokens:
rounded-radius2             → 2px
rounded-radius3             → 3px
rounded-radius4             → 4px
rounded-radius5             → 5px
rounded-radius6             → 6px
rounded-radius7             → 7px
rounded-radius8             → 8px
rounded-radius10            → 10px
rounded-radius12            → 30px  [!] — pill-like
rounded-radius14            → 50px  [!] — very rounded
rounded-radius15            → 100px [!] — full pill
```

**Key observations:**
- Product image containers: `rounded-lg` (8px)
- CTA buttons: `rounded-3xl` (24px) — pill-shaped
- Mega menu: `border-radius: 3px` (hardcoded in module CSS)
- Submenu images: `border-radius: 10px` (hardcoded)
- Section banners: `rounded-lg` or `rounded-xl`

---

## 7. SHADOW SYSTEM

```
Default card shadow:     box-shadow: 0 0 6px rgba(0,0,0,0.2)  (profile card)
Mega menu shadow:        box-shadow: 0 4px 7.28px 0.72px rgba(0,0,0,0.2)
Product card shadow:     shadow-md  (Tailwind standard)
Background card strip:   shadow    (light, Tailwind default)
USP bar shadow:          shadow    (on the white rounded USP banner below hero)
```

---

## 8. LAYOUT SYSTEM & GRID

### Container Strategy
```
.container-fluid {
  /* Custom class — full-width with padding */
  padding: 0 [varies by context]
}

max-width container: 1240px (header only)
Standard page content: container-fluid with padding adjustments
```

### Homepage Layout Architecture (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  UTILITY BAR (top strip — promotions, links)                │
├─────────────────────────────────────────────────────────────┤
│  HEADER                                                     │
│  ┌──────────────┬──────────────────────┬──────────────────┐ │
│  │ Logo (244px) │   Search (max 500px) │ Nav Icons (4)    │ │
│  └──────────────┴──────────────────────┴──────────────────┘ │
│  MEGA MENU (horizontal, flex, full-width)                   │
├─────────────────────────────────────────────────────────────┤
│  HERO SECTION                                               │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Primary slider (63%)   │ │  2 stacked banners (37%)│   │
│  │  [8-9 slides, 470px h]  │ │  [each 592px h / 2]     │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  USP BAR (bg-gray-100, flex row)                           │
│  ┌────────────────────────────┐ ┌────────────────────────┐  │
│  │ Empty / Ratings display    │ │ 4 USP icons (55% / 45%)│  │
│  └────────────────────────────┘ └────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  CATEGORY TABS (Radix Tabs) — All / Living / Bedroom / ...  │
│  → Category icon grid below (auto-scrolling)               │
├─────────────────────────────────────────────────────────────┤
│  EXPERIENCE STORES SECTION (bg: lightgrayColor, rounded-xl) │
│  ┌─────────────────────────────┐ ┌───────────────────────┐  │
│  │  Store video thumbnail       │ │  City grid 2×6        │  │
│  │  (aspect-video, rounded-xl)  │ │  + CTA buttons        │  │
│  └─────────────────────────────┘ └───────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  SECTION: "India's Finest Online Furniture Brand"            │
│  → h1 inline in paragraph, expandable description           │
│  → [300px / 400px placeholder — lazy-loaded product reel]   │
├─────────────────────────────────────────────────────────────┤
│  PRODUCT SECTION: "Discover what's new"  (bg: #F5F5F5)      │
│  → Product card carousel (Swiper, 400-480px height placeholder)│
├─────────────────────────────────────────────────────────────┤
│  PRODUCT SECTION: "Top-Rated by Indian Homes" (bg: white)   │
├─────────────────────────────────────────────────────────────┤
│  PROMOTIONAL SECTION (bg: #FFF2F2)  [350px height]          │
├─────────────────────────────────────────────────────────────┤
│  MID-BANNER SWIPER (category banner ads)                    │
├─────────────────────────────────────────────────────────────┤
│  "Stories Behind the Style" — Video product cards           │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                     │
└─────────────────────────────────────────────────────────────┘
```

### Hero Layout (Exact)
```
Desktop:
  Left: section with Swiper — basis ~63%, or calc with gap
        Slides: h-[470px] min-h-[470px], rounded-lg images
        Nav arrows: absolute, bg-white/50, p-2, rounded-full
  Right: w-[37%], flex-col, gap-4
        Two stacked image cards (no shadow, border-none)
        Each: 552×592 source dimensions

Mobile:
  Left section becomes full-width horizontal scroller
  Right section: hidden (hidden md:flex)
  Slide indicators: absolute pill dots below (flex, gap-2)
  Active indicator: w-8, wider, bg-primaryBg with progress animation
  Inactive: w-5, bg-secondary200
```

---

## 9. NAVIGATION SYSTEM

### Architecture

```
Level 1 (Top utility bar):
  - 3 columns: left (links), center (promo text), right (phone/track order)

Level 2 (Main header):
  - Logo | Search Bar | Action Icons (Stores, Profile, Wishlist, Cart)

Level 3 (Mega Menu):
  - Flat horizontal list: Sofas | Living | Bedroom | Dining | Storage | ...
  - On hover: full-width mega dropdown (position: absolute, z-index: 9999)

Level 4 (Submenu):
  - CSS Modules-controlled: display:none → display:block on parent:hover
  - Grid: flex row of .style_subMenucard columns
  - Each card: padding 20px 15px, border-right 1px solid #EAE4E2
  - Even cards: background #F9F9F9 (alternating)
  - Last card: transparent bg (for image placement)
  - Submenu link: color #535353, font-size 13px, font-weight 300
  - Submenu heading: color #000000, font-weight 500
  - Hover state: color #E57200 (brand orange)
```

### Nav Icons (Right Side)
Each icon is a flex column: icon (23×22px SVG) + label text underneath.
- Icon color: `#4A4A4A`
- Label: `font-family: red_hat_displayregular`, `font-size: 12px`, `color: #4A4A4A`, `letter-spacing: 0.02em`
- Layout: `inline-flex flex-col items-center justify-center min-width: 40px`

### Mobile Navigation
- Desktop header: `display: none` at `max-width: 767px`
- Mobile: Different component (not analyzed from this snapshot, but inferred to be drawer-based)

### Search
- Max-width: 500px, centered
- Border: `1px solid #DDD`, border-radius: 3px
- Input: height 40px, font-size 14px, color #202020
- Button (search icon): positioned absolute, right 7px, top 10px
- Autocomplete dropdown: `.style_TopSearchesBox` — "Recent View" + "Trending Searches" grid

---

## 10. COMPONENT LIBRARY

### Product Card (Video/Image)

```
Structure:
  .bg-white.rounded-sm.shadow-md.p-1.mb-3.relative.block.w-full.text-left
    ├── Media container: h-80 md:h-full rounded overflow-hidden
    │     └── <video autoplay loop muted playsinline> OR <img>
    │           class: h-auto w-auto object-cover w-full md:min-h-[400px]
    │           mobile: -mt-20 (negative margin to crop top)
    ├── Title: pt-2 px-1 my-1 mb-2 min-h-12 text-sm font-medium
    │         font-redhatRegular tracking-wide text-secondarytext line-clamp-2
    ├── Rating: flex items-center gap-1 text-primaryBg text-base mb-3
    │     ├── Stars: 5× SVG, 16×16px, fill #E27A34 (half-star uses white fill)
    │     └── Count: text-secondary600 text-font11 font-redhatRegular ml-2
    └── Price row: flex justify-normal items-center mb-2 md:mb-3
          ├── Current: text-secondarytext text-sm md:text-font19 font-redhatMedium mr-1
          ├── Original: <del> text-font13 md:text-sm text-secondary500 font-redhatRegular
          └── Discount: text-successColor text-font13 md:text-sm font-redhatMedium
```

### Section Header Pattern

```html
<!-- Section heading block (reused across all product sections) -->
<div class="flex items-center justify-between mb-4 md:mb-6">
  <div>
    <p class="text-lg md:text-2xl tracking-wide font-redhatMedium text-secondarytext">
      Section Title
    </p>
    <p class="hidden md:block text-secondary700 font-redhatRegular tracking-wide text-xs md:text-sm">
      Subtitle tagline
    </p>
  </div>
  <a class="rounded-3xl bg-white border border-secondary400 px-4 py-1.5 flex md:pt-2 gap-1
            text-xs md:text-sm font-redhatMedium tracking-wider capitalize text-secondarytext
            items-start cursor-pointer">
    View All
    <svg class="lucide lucide-arrow-right hidden md:block w-5 h-5 text-secondary600">
  </a>
</div>
```

### "View All" Button

- **Shape:** `rounded-3xl` (pill, 24px radius)
- **Background:** `bg-white`
- **Border:** `border border-secondary400` (1px, `#ACACAC`)
- **Text:** `text-xs md:text-sm font-redhatMedium tracking-wider capitalize text-secondarytext`
- **Padding:** `px-4 py-1.5` + `md:pt-2`
- **Arrow icon:** `lucide-arrow-right` hidden on mobile, `w-5 h-5 text-secondary600`

### CTA Buttons (Primary)

```
Style: Outlined pill  
Border: border border-primaryBg
Text: text-primaryBg
Border-radius: rounded-3xl (24px) or rounded-full
Font: font-redhatMedium tracking-wide
Padding: px-6 py-2 (desktop)

Example: "Visit Nearest Store", "Book an Appointment"
```

### USP Bar

```
Outer: container-fluid flex flex-col md:flex-row justify-between items-stretch
       gap-3 md:gap-2 md:rounded-md bg-gray-100 !px-[10px] !py-3.5 md:!px-7 md:!py-5

Left section (55%): bg-white rounded-md shadow, min-h-[65px] md:min-h-[80px]
Right section (45%): bg-white rounded-md shadow, md:p-3.5

USP items: flex-1 flex flex-col lg:flex-row items-center text-center gap-1 md:gap-[6px]
  Image: 45×45px
  Text: text-xs md:text-font13 tracking-wide text-center md:text-left
        text-secondarytext font-redhatRegular ml-0 md:ml-2
```

### Category Tabs (Radix Tabs)

```
Active state:  text-primaryBg, border-b-2 border-primaryBg (mobile)
               border border-secondary300 rounded-full (desktop, inactive)
               On active desktop: border-b only? — both classes present

Tab button: inline-flex items-center justify-center whitespace-nowrap font-medium
            p-2 md:px-6 md:py-1.5 text-sm
            border-b-2 border-transparent text-secondarytext
            tracking-wide font-redhatMedium rounded-none
            md:border md:border-secondary300 md:rounded-full

Active variant: data-[state=active]:text-primaryBg
                data-[state=active]:border-b-2 data-[state=active]:border-primaryBg
                data-[state=active]:md:border-b (suppresses full border on desktop when active)
```

### Store Visit / Appointment Buttons (Outlined)

```
"Visit Nearest Store":
  rounded-3xl px-2 md:px-6 flex-auto py-2
  flex items-center justify-center gap-1
  text-font12 md:text-sm font-redhatMedium tracking-wide
  text-primaryBg border border-primaryBg cursor-pointer

"Book an Appointment":
  flex justify-center flex-auto items-center gap-2 md:max-w-80
  px-1 text-left md:px-4 py-2 bg-white text-font12 md:text-sm
  font-redhatMedium rounded-3xl md:rounded-full
  transition hover:bg-pr line-clamp-1 text-primaryBg border border-primaryBg
```

---

## 11. ANIMATION & MOTION

### Carousel Slide Indicators

The homepage hero uses animated pill indicators:
```css
/* Active slide indicator expands and fills */
.active-indicator {
  width: w-8;            /* wider than inactive (w-5) */
  background: bg-primaryBg;
  height: h-1;
  border-radius: rounded-full;
  overflow: hidden;
}

/* Progress bar inside active indicator */
.progress-fill {
  animation: progressAnimation 8000ms linear forwards;
  /* fills from left to right over 8 seconds = slide duration */
}
```

### Standard Transitions

- Navigation dropdowns: `transition: all 0.3s ease`
- Sub-menu reveal: `transition: all 0.3s ease`
- Menu link hover underline: `transition: all 0.2s ease`
- Profile card: `transition: all 0.3s ease`
- Search box: No explicit transition (click-to-open pattern)

### Tailwind Animations in Use

```
animate-bounce         → 1s infinite (usage: loading states)
animate-spin           → 1s linear infinite (loaders)
animate-pulse          → 2s ease-in-out (skeleton loaders)
animate-infinitescroll → 25s linear infinite (brand logos strip)
```

### Hover Effects on Images

- Hero slider arrows: `hover:bg-white/80` (backdrop opacity increase)
- Submenu links: color → `#E57200`
- Profile dropdown link: `background-color: #F5F5F5`
- Sign-in button: `background-color: #E57200; color: #fff`

---

## 12. RESPONSIVE BREAKPOINTS

| Breakpoint | Value | Behavior |
|---|---|---|
| Mobile | `max-width: 767px` | Desktop header hidden, mobile nav shown |
| Tablet | `768px` (md) | Tailwind md breakpoint, many layout switches |
| Small Desktop | `991px` | Nav font-size reduces to 11px |
| Medium Desktop | `1100px` | Logo shrinks, search bar reduces |
| Large Desktop | `1280px` | Header gets inline padding instead of centered container |

### Key Responsive Switches

```
Header:         hidden on mobile (<767px)
Hero:           Left slider full-width on mobile, right column hidden
Hero pagination: Pill dots (mobile only), prev/next arrows (desktop only, hidden md:flex)
Category tabs:  Horizontal scroll overflow on mobile
                Rounded-full bordered tabs on desktop
USP section:    Stack column on mobile, side-by-side on desktop
Section headings: text-lg → text-2xl
Product title:  text-font10 → text-sm md:uppercase on category chips
Image heights:  md:h-[470px] for hero slides
```

---

## 13. INFORMATION ARCHITECTURE

### Navigation Categories (Mega Menu)
```
1. Sofas         → Sofa, Sofa Cum Bed, Recliners, Seating
2. Living        → All Sofas, Coffee Tables, Lounge Chairs...
3. Bedroom       → Beds, Wardrobes, Mattresses...
4. Dining        → Dining Sets, Chairs, Dining Tables, Bar Furniture, Kitchen
5. Storage       → TV Units, Wardrobes, Shoe Racks...
6. [More categories]
7. [Sale/New Arrivals — inferred]
```

### Homepage Section Sequence (IxD Flow)

```
1. Utility bar   → Trust signals (EMI, track order)
2. Header        → Search + utility actions
3. Mega menu     → Category discovery
4. Hero banner   → Sale/season campaign imagery
5. USP bar       → "Why choose us" (instant trust)
6. Category tabs → Shop by room (personalized entry point)
7. Stores section → Physical presence = credibility
8. Brand copy    → SEO + brand narrative (h1 placement)
9. New Arrivals  → Recency signal, FOMO
10. Best Sellers → Social proof (ratings-driven)
11. Promotional  → Campaign CTA (#FFF2F2 background)
12. Mid-banners  → Category deep-links (impulse browsing)
13. Style Stories → Video-first content commerce (engagement)
14. Footer       → Links, legal, social
```

---

## 14. ICON SYSTEM

All icons are **inline SVG**, using `stroke="currentColor"` for theme-ability.

| Icon | Size | Style | Color context |
|---|---|---|---|
| Store | 28×28px | Stroke-only, 1.5px weight | `text-primaryBg` (orange) |
| Profile | 23.6×23.5px | Fill-based (#4a4a4a) | Static dark |
| Wishlist/Heart | 22×20.5px | Fill-based (#4a4a4a) | Static dark |
| Cart | 22×20.2px | Fill-based (#4a4a4a) | Static dark |
| Search | 24×24px | Stroke, 1.5px, #515151 | Static secondary |
| Arrow-right | 24×24px | Stroke (Lucide) | `text-secondary600` |
| Location pin | 23×23px | Stroke, 1.3px | `currentColor` (inherits primaryBg) |
| Calendar | 21×21px | Stroke, 1.5px | `currentColor` (inherits primaryBg) |
| Star (full) | 16×16px | Fill + stroke, #E27A34 | Fixed |
| Star (half) | 17×17px | Path fill + white clip | Split fill technique |

---

## 15. REUSABLE PATTERNS

### Pattern 1: Section Container
```
<div class="container-fluid mx-auto rounded-lg"
     style="background-color: [color]; padding: 0">
  <div class="py-5 px-3 md:py-7 my-0 md:px-7">
    [Section Header + Content]
  </div>
</div>
```

### Pattern 2: Badge / Tag
Tags appear on product images (inferred from CSS):
- Position: absolute, top-left
- Background: varies (orange for "Sale", green for "New")
- Font: `font-redhatMedium`, uppercase, 10-11px

### Pattern 3: Price Block
```
<div class="flex justify-normal items-center mb-2 md:mb-3">
  <span class="text-secondarytext text-sm md:text-font19 tracking-wide font-redhatMedium mr-1">
    ₹[current price]
  </span>
  <del class="text-font13 md:text-sm text-secondary500 font-redhatRegular tracking-wide mx-1">
    ₹[original price]
  </del>
  <span class="text-successColor text-font13 md:text-sm font-redhatMedium tracking-wide flex items-center">
    [X]% OFF
  </span>
</div>
```

### Pattern 4: Rating Stars
```
5× <svg stroke="#E27A34" fill="#E27a34" stroke-width="1" width="16" height="16">
   [full star path]
</svg>
+ half-star SVG (path1: fill="#E27A34", path2: fill="white" — creates halved effect)
+ <span class="text-secondary600 text-font11 font-redhatRegular ml-2">([count])</span>
```

### Pattern 5: Expandable Text
```html
<div class="text-expand-content overflow-hidden h-5 truncate flex-auto text-sm tracking-wide">
  [Long description text]
</div>
<button class="mt-0.5 md:mt-2 self-start text-primaryBg text-sm bg-white font-pangramregular">
  More
</button>
```

---

## 16. Z-INDEX LAYER SYSTEM

```
Base content:      z-0, z-1, z-2
Sticky elements:   z-10, z-20, z-30
Overlays/dropdowns:z-40, z-50 (!z-50)
Navigation (header):z-39 (custom, keeps below modals)
Mega menu:         z-9999
Profile dropdown:  z-10 (within header context)
Modals/dialogs:    z-[1000], z-[1111], z-[10001]
Critical overlays: z-[999999]
```

---

## 17. FIGMA RECONSTRUCTION GUIDE

### Design File Structure

```
📁 WoodenStreet Design System
  📁 Foundations
    🎨 Color Styles
      - Primary/brand-orange: #E37A34
      - Primary/active: #E85B1A
      - Secondary/200: #E7E7E7
      - Secondary/700: #515151
      - Text/heading: #515151
      - Text/dark: #202020
      - Success: #4CAF4F
      - Danger: #F23433
      - Background/page: #FFFFFF
      - Background/light: #F5F5F5
      - Background/pink-promo: #FFF2F2
    📝 Text Styles
      - Heading/2xl-medium: Red Hat Display Medium, 24px, tracking+0.02
      - Heading/lg-medium: Red Hat Display Medium, 18px, tracking+0.02
      - Body/sm-regular: Red Hat Display Regular, 14px, tracking+0.02
      - Price/current: Red Hat Display Medium, 19px
      - Price/original: Red Hat Display Regular, 13px, strikethrough
      - Caption/xs: Red Hat Display Regular, 10-11px
      - Button/sm: Red Hat Display Medium, 12-14px, tracking+0.04
    📐 Spacing (Auto Layout)
      - 4px grid
      - Component gap: 4, 6, 8, 12, 16, 20, 24, 32px
    🔲 Border Radius
      - sm: 4px (cards)
      - md: 8px (images, sections)
      - pill: 24px (buttons)
      - full: 9999px (indicators)

  📁 Components
    📁 Navigation
      - Utility Bar
      - Header (Logo + Search + Icons)
      - Mega Menu (Mega dropdown template)
    📁 Product Cards
      - Card/Video
      - Card/Image
      - Card/Skeleton
    📁 Buttons
      - Primary Outlined (pill, orange border+text)
      - Secondary Outlined (pill, gray border)
      - Ghost (text only, orange)
    📁 Banners
      - Hero Slide (1440×679 aspect)
      - Mid Banner (500×300 ratio)
      - Stack Banner (552×592)
    📁 Sections
      - Section Header (title + subtitle + "View All" link)
      - USP Bar
      - Category Tab Strip
    📁 Forms
      - Search Input

  📁 Pages
    📁 Homepage
      - Desktop (1440px)
      - Mobile (390px)
    📁 Product Detail
    📁 Category Listing
```

### Component Spacing Specifics for Figma

```
Section container outer padding (desktop): px-9 py-11 (36px, 44px)
Section container outer padding (mobile):  px-3 py-5 (12px, 20px)
Product card padding: p-1 (4px) all sides
Product card mb: mb-3 (12px)
Section heading mb-to-grid: mb-4 md:mb-6 (16px / 24px)
Hero gap between panels: gap-4 (16px)
USP items gap: gap-[6px] between icon and text
Nav icon margin: 0 12px horizontal
```

---

## 18. KEY UX PRINCIPLES OBSERVED

1. **Persistence of social proof:** Rating stars, customer count, review count appear on every product touchpoint.

2. **Progressive disclosure:** Product descriptions use `line-clamp-2` + "More" button. Section text uses `h-5 truncate` + "More" expansion.

3. **Visual hierarchy through weight, not size:** Section headings are `Medium` weight at 24px, not Bold. This creates calm authority, not aggressive push.

4. **Orange is reserved for action + price:** The `primaryBg` orange only appears on CTAs, active states, rating stars, discount percentages, and link highlights. Never used decoratively.

5. **Search autocomplete as discovery:** The search box surface shows trending searches and recent views, turning a utility element into a discovery surface.

6. **Lazy loading with explicit sizes:** All images use `loading="lazy"` except hero images (`loading="eager"`). All images specify explicit `width` and `height` for CLS prevention.

7. **Mobile-first architecture:** Responsive system hides desktop header entirely and replaces with a separate mobile nav, rather than adapting — suggesting independent mobile UX design.

8. **Video-first product storytelling:** The "Stories Behind the Style" section uses autoplay, looped, muted videos (product demos) as primary card media, placing WoodenStreet among early adopters of video commerce.
