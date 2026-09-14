# Build, assets, and SEO

The storefront is a client-rendered Vite single-page application. Express is a separate JSON API and does not render React pages.

## Build and routing

- Build the client with `npm run build` in `client/`; Vite writes `client/dist/`.
- Every production static host must use `client/nginx.conf`-equivalent history fallback so React Router paths resolve to `index.html`.
- Route pages are lazy-loaded from `client/src/App.tsx`. Keep new substantial pages behind dynamic imports.
- `VITE_*` values are compiled into the browser bundle. Never place secrets in them.
- Configure `VITE_API_URL` as an API origin without a trailing `/api`; leave it empty for the local Vite proxy.
- Use root `nixpacks.toml` or `server/Dockerfile` for the API and the files under `client/` for the static client.

## Assets

- Static assets live under `client/public/` and are referenced with root-relative URLs.
- Product, category, and invoice assets use the approved Supabase Storage buckets and policies.
- Supply meaningful `alt` text for content images. Decorative images may use an empty `alt` value.
- Validate uploaded image MIME type and size through the shared storage helper.
- Preserve explicit image dimensions or aspect ratios to prevent layout shift.

## SEO and accessibility

- `client/index.html` owns site-wide metadata. Route-specific metadata requires an explicit client-side head strategy or a prerendering decision; do not claim server-rendered metadata.
- Keep one primary `h1` per page and use semantic heading order.
- Prefer semantic `header`, `main`, `section`, `article`, `aside`, and `footer` elements.
- Every form control needs an associated label or accessible name, plus stable `id` and `name` values where forms submit data.
- Use React Router `Link` for internal navigation.
- Public-route additions must be reflected in any static sitemap/robots assets once those assets exist. Account, checkout, order, reset-password, and admin routes must not be presented as indexable public content.
- Verify keyboard operation, focus visibility, mobile layout, and loading/error states for every new route.
