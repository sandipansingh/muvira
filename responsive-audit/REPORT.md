# Responsive storefront verification — after fixes

Date: 24 September 2026. Baseline and prioritised causes are in [ISSUES.md](ISSUES.md). Phase 1 was committed as `7701247`; Phase 2 as `5146b29` and `ee5b5ec`.

## Coverage and results

`pnpm run test:responsive` runs the permanent Playwright spec against the Vite client and Express API. The final run covers 21 route states × 35 viewport/DPR/text-scale cases = 735 full-page screenshots, plus 21 opened-overlay screenshots. The added route state is a populated **guest** cart, created through the existing Add to Cart UI. The matrix includes all requested phone/tablet/desktop dimensions, effective zoom widths, DPR 1/1.5/2/3, and a simulated 200% root font size at 320, 960, and 1280 CSS px. Screenshots and machine-readable findings are saved locally in `after/`; the full generated set is git-ignored because it is large, while the representative captures linked below are tracked.

| Automated finding | Before (700 route cases) | After (735 route cases) |
| --- | ---: | ---: |
| Document horizontal-overflow cases | 19 | 0 |
| Out-of-viewport descendants | 334 samples | 0 |
| Touch targets below 44×44 CSS px | 7,013 samples | 0 |
| Body-copy elements below 14px | 1,143 samples | 0 |
| Images without intrinsic dimensions or reserved aspect ratio | 1,806 samples | 0 |
| Vertically clipped interactive content | 0 | 0 |
| Default fixed/sticky intersections | 0 | 0 |
| Navigation failures / application console errors | 0 / 0 | 0 / 0 |
| Potential high-DPR source-resolution risks | 101 samples | 224 samples |

The open-overlay audit checks reachability and geometry at 320, 390, 960 and 1280 CSS px; all 21 cases passed the asserted checks. Its 33 fixed/sticky intersections are backdrop/dialog or backdrop/header intersections, which are intentional and excluded from that assertion. Chromium logs `Unrecognized feature: 'web-share'` from the third-party Razorpay SDK; the spec excludes only that exact warning, not other console messages. Image-resolution results are screening flags rather than proof of visible blur; `object-fit` crops can cause a flag even when the source has enough useful pixels. The before/after sharpness counts are not directly comparable because the audit now includes a populated cart and images can vary with catalog responses.

## Issues fixed

- The 320px header search interception and 200%-text horizontal overflow were corrected through the shared header, container, grid and wrapping rules (`client/src/components/layout/Header.tsx`, `client/src/index.css`, `client/src/components/catalog/CatalogTopBar.tsx`, `client/src/pages/ShopPage.tsx`, `client/src/pages/SearchPage.tsx`).
- Shared buttons, icon actions, listing controls, PDP/gallery controls, cart controls and form links now meet the touch-target checks. Tablet product-card actions no longer depend on hover; the gallery supports touch interaction. The mobile PDP purchase bar, drawer focus/scroll handling, filter action bar and safe-area padding were added in Phase 2 (`client/src/components/ui/Button.tsx`, `client/src/components/catalog/`, `client/src/components/product/`, `client/src/components/layout/MobileMenu.tsx`, `client/src/components/cart/CartDrawer.tsx`, `client/src/lib/hooks/useDialogFocus.ts`).
- Small body text and image-dimension risks were cleared in shared home, footer, auth and catalog markup. Existing imagery, fonts and design tokens were retained (`client/src/components/home/`, `client/src/components/layout/Footer.tsx`, `client/src/components/auth/`, `client/src/components/catalog/`).
- The new populated-cart state exposed undersized breadcrumb/product links, 11px unit-price copy and overflow at 320px with 200% text. Phase 3 adjusted only link hit areas, flex wrapping, spacing and text layout (`client/src/components/checkout/FlowHeader.tsx`, `FlowItemCard.tsx`, `FlowCartSidebar.tsx`, `RecommendedUpsell.tsx`, `client/src/pages/CartPage.tsx`).
- Lighthouse exposed a hero loading/empty-state height mismatch and redundant logo alt text. The hero now reserves the same height in both states; the icon-only shopping action has a name; logo marks adjacent to visible brand text are decorative (`client/src/components/home/HeroSlider.tsx`, `client/src/components/layout/{Header,Footer,MobileMenu}.tsx`, `client/src/pages/{SignIn,SignUp}Page.tsx`).

Representative before/after captures (the populated cart has no Phase 1 capture):

| Page/state | Before | After |
| --- | --- | --- |
| Home, 320px | [Before](before/home__320x568-phone-dpr3.jpg) | [After](after/home__320x568-phone-dpr3.jpg) |
| Home, 320px with 200% text | [Before](before/home__320x568-text-200-dpr1-text200.jpg) | [After](after/home__320x568-text-200-dpr1-text200.jpg) |
| PLP, 960px effective zoom | [Before](before/shop__960x540-desktop-dpr1.jpg) | [After](after/shop__960x540-desktop-dpr1.jpg) |
| PDP, 320px | [Before](before/product__320x568-phone-dpr3.jpg) | [After](after/product__320x568-phone-dpr3.jpg) |
| Empty cart, 320px | [Before](before/cart__320x568-phone-dpr3.jpg) | [After](after/cart__320x568-phone-dpr3.jpg) |
| Populated cart, 320px / 200% text | Not covered | [After](after/cart-populated__320x568-text-200-dpr1-text200.jpg) |
| Mobile filters | [Before](before/filters-open__320x568-phone-dpr3.jpg) | [After](after/filters-open__320x568-phone-dpr3.jpg) |

## Lighthouse: production build

Lighthouse 12.8.2 was run against a locally served production client build made with `VITE_API_URL=` so its API requests use the local Express proxy; all observed API responses were HTTP 200. The repository's normal production build points at `api.muvira.in`, which is not reachable in this environment and was **not** used for the scores below. Scores are one-run lab measurements, not field Core Web Vitals. `/checkout` redirects a guest to `/signin`; its row measures that redirect page only, not shipping/payment.

| Route | Mobile Perf. | Mobile A11y | Mobile CLS | Mobile LCP | Desktop Perf. | Desktop A11y | Desktop CLS | Desktop LCP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home `/` | 62 | 100 | 0.000 | 10.1s | 72 | 100 | 0.050 | 3.1s |
| PLP `/shop` | 76 | 100 | 0.000 | 5.0s | 96 | 100 | 0.015 | 1.3s |
| PDP `/product/:slug` | 63 | 100 | 0.036 | 14.6s | 81 | 100 | 0.022 | 3.0s |
| Empty guest cart `/cart` | 66 | 100 | 0.000 | 7.6s | 97 | 100 | 0.000 | 1.1s |
| Checkout guest redirect → `/signin` | 66 | 100 | 0.000 | 7.2s | 88 | 100 | 0.001 | 1.2s |

The authenticated checkout itself has no score without an approved test session. All measured CLS values meet the <0.1 target; all measured mobile LCP values miss the <2.5s target. The home, listing and PDP LCP elements are externally served images, and image/API timing causes substantial lab-run variability. Lighthouse navigation cannot measure real-user INP. A 100 Lighthouse accessibility score is not a full WCAG 2.2 AA certification.

## Verification and scope

- `pnpm run lint:fix`, `pnpm run format`, `pnpm run build`, `pnpm run type-check` and `pnpm test` passed after the final code edits; `pnpm test` reported 43 passed, 11 environment-dependent skipped, 0 failed. `graphify update .` could not run because `graphify` is not installed (`command not found`).
- Phase 3 touched only the cart/checkout, hero, logo and auth-logo presentation files named above, the audit harness `responsive-audit/audit.mjs`, `tests/responsive.spec.ts`, `playwright.config.ts`, the root `package.json` test script, `.gitignore`, and this report. It did not change commerce logic, API calls, Supabase queries, Razorpay/Shiprocket flows, routing, authentication or data models. The new guest-cart test uses the existing product and cart UI, without a synthetic commercial-data fallback.
- Phase 2 presentation changes also span `client/index.html`, `client/tailwind.config.js`, `client/src/index.css`, `client/src/pages/{Categories,Checkout,NotFound,OrderDetail,OrdersHistory,ProductDetail,Profile,Search,Shop,SignIn,SignUp}Page.tsx`, and the `client/src/components/{auth,cart,catalog,checkout,common,home,layout,product,ui}/` files listed in the Phase 2 commits. The only new client utility, `client/src/lib/hooks/useDialogFocus.ts`, manages overlay focus and body scroll; it does not change data behaviour.

For a precise Phase 2 file inventory, the component files are:

| Area | Files within `client/src/components/` |
| --- | --- |
| Auth | `auth/AuthHeroCard.tsx`, `auth/ForgotPasswordModal.tsx` |
| Cart | `cart/CartDrawer.tsx`, `cart/CartItemRow.tsx` |
| Catalog | `catalog/CatalogSidebar.tsx`, `catalog/CatalogTopBar.tsx`, `catalog/ProductCard.tsx`, `catalog/ProductGrid.tsx`, `catalog/QuickViewModal.tsx`, `catalog/ShopHero.tsx` |
| Checkout | `checkout/FlowCartSidebar.tsx`, `checkout/FlowItemCard.tsx`, `checkout/OrderSummaryCard.tsx`, `checkout/RazorpayPayment.tsx`, `checkout/RecommendedUpsell.tsx`, `checkout/ShippingSection.tsx` |
| Common | `common/Breadcrumbs.tsx`, `common/Modal.tsx`, `common/Pagination.tsx`, `common/Toast.tsx` |
| Home | `home/BestSellers.tsx`, `home/CategoryGrid.tsx`, `home/HeroSlider.tsx`, `home/NewArrivals.tsx` |
| Layout | `layout/Footer.tsx`, `layout/Header.tsx`, `layout/MobileMenu.tsx` |
| Product | `product/ImageGallery.tsx`, `product/ProductAccordion.tsx`, `product/ProductInfo.tsx` |
| UI | `ui/Button.tsx`, `ui/Dropdown.tsx` |

## Remaining limitations and recommended follow-up

1. No approved sandbox account, populated orders or representative addresses were available. Checkout shipping/payment, Razorpay’s live modal/redirect, order timeline, account/address screens and authenticated error states were only audited at the guest redirect or by static inspection. Re-run the same matrix with approved seeded fixtures before claiming full coverage of those states.
2. The audit approximates desktop zoom and large-text settings with effective CSS viewports and a 200% root font. Native browser zoom, OS-level large text, notched-device safe areas, pinch zoom and touch gestures need a real-device pass.
3. Potential high-DPR image-resolution risks remain in source catalog/category assets; obtain higher-resolution/modern-format variants through the existing asset pipeline and remeasure. Do not upscale low-resolution source images in CSS.
4. Prioritise responsive source-image variants and loading-path analysis for the home hero, PLP banner and PDP primary image, then repeat Lighthouse with stable staging data and authenticated checkout. Mobile LCP missed <2.5s on every measured page; real-user INP <200ms remains unmeasured. The lab CLS results passed, but should also be checked in the field.
