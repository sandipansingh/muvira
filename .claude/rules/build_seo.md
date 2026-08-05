# Build, Image & SEO Guidelines

This file covers Next.js SSR (Server-Side Rendering) builds, asset optimizations, and SEO/accessibility requirements.

---

## Next.js SSR (Server-Side Rendering) Rules

This project uses Next.js Server-Side Rendering (SSR) running on a Node.js server environment. Pages are dynamically pre-rendered on the server per-request or served via server caching.

- **Dynamic Routes**: Server-side dynamic page routes (such as `/packages/[slug]/page.tsx`) can render dynamically on request. `generateStaticParams()` is optional for pre-building known static parameters, but not required for dynamic request rendering.
- **Server APIs Supported**: Dynamic server-side APIs such as `headers()`, `cookies()`, `draftMode()`, `redirect()`, and `noStore()` / `connection()` are fully supported and recommended for server-side logic and request processing.
- **Data Fetching & Caching**: Use Next.js `fetch` cache options (`revalidate`, `cache: 'force-cache'`, or `cache: 'no-store'`) and React `cache()` for request-time or periodic data revalidation (ISR).
- **Revalidation & ISR**: Dynamic route revalidation (`export const revalidate = ...` or `revalidatePath()` / `revalidateTag()`) is fully enabled and supported in Next.js SSR.
- **404 & Redirect Handling**: `notFound()` and `redirect()` functions work dynamically at request time to route users or handle missing data seamlessly.

---

## Next.js Image Optimization Rules

- **Sizes Property**: Any `Image` component that utilizes the `fill` layout property **must** include a descriptive `sizes` attribute (e.g. `sizes="(max-width: 768px) 100vw, 33vw"`). This is a build constraint enforced by Next.js.
- **Priority Property**: Apply `priority={true}` to the first 1 or 2 images visible above the fold (such as the main Hero banner or the first destination card) for LCP (Largest Contentful Paint) optimization.
- **Asset Sources**: All local images are loaded from the `/public/images/` path. Remote image addresses must be whitelisted in `next.config.mjs` (currently `images.unsplash.com` and `img.freepik.com` are allowed).

---

## SEO & Semantic HTML Rules

Follow these standards to ensure search engine optimization and standard-compliant markup:

1. **Title & Meta Headers**:
   - Every page must render descriptive `<title>` and `<meta name="description">` headers via Next.js metadata API.
   - Summarize the contents concisely while naturally integrating regional keywords.
2. **Heading Hierarchy**:
   - Each page must have exactly one unique `<h1>` element serving as the main entry heading.
   - Standardize subsections using logical descending order (`<h1>` → `<h2>` → `<h3>` etc.) without skipping levels.
3. **Semantic Tags**:
   - Structure layout layouts using semantic tags (`<header>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`) instead of nested default `<div>` blocks.
   - Wrap the primary page contents inside a single `<main>` container for screen readers.
4. **Image Alt Tags**:
   - Provide clear, descriptive `alt` string descriptions for all `Image` components. Never leave an `alt` field empty or write generic names like "image" or "photo".
5. **Form Field Identifiers**:
   - Ensure all interactive inputs, form fields, drop-down menus, and action buttons have unique, descriptive `id` and `name` attributes.
6. **Internal Links**:
   - Use Next.js `<Link>` components for all internal route transitions to allow search crawler indexing.
7. **Sitemap and Robots.txt Updates**:
   - When adding new pages or introducing new dynamic page routes (or custom data-driven content collections like blogs, regions, categories, etc.), you **must** update the sitemap generator (`src/app/sitemap.ts`) to output these paths.
   - You must also update the user-facing HTML sitemap (`src/app/sitemap/page.tsx`) to display the new sections or key paths.
   - If any new routes require search exclusion (e.g. admin panels, booking flows, or webhook paths), verify and update `src/app/robots.ts` as necessary to enforce the correct crawlers rules.
