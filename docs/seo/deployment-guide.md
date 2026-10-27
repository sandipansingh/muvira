# Muvira technical SEO deployment guide

Implemented 28 October 2026. Production deployment is a separate operational step.

The frontend Node host inserts route-specific metadata into Vite HTML before JavaScript executes. React still renders the page body in the browser; this is head rendering, not server-side React rendering. `client/src/lib/seo/metadata.mjs` owns shared copy, canonical, robots and schema rules. `RouteSeo` updates the same tags after navigation and removes old product markup immediately. No database migration or product URL change is required.

## Runtime configuration and API-first rollout

1. Generate a random secret of at least 32 characters using your secret manager. Set `SEO_INTERNAL_TOKEN` to the same value on the API and frontend runtime. Never put it in `VITE_*`, a build argument, an image layer, a URL, logs or client code.
2. Deploy the API changes first. The header `X-Muvira-SEO-Token` only selects a separate catalog quota for verified GETs to `/api/products`, `/api/products/:slug`, `/api/categories` and `/api/categories/:slug`. Its quota is 3,000 requests per 15 minutes **per API process**, shared across all frontend instances. All other requests retain the existing 300-request quota and route authorization. This token does not grant admin access. Product responses continue to use `Cache-Control: no-store`.
3. Configure the frontend host:

   | Variable | Production | Staging |
   | --- | --- | --- |
   | `SITE_URL` | `https://muvira.in` | Dedicated HTTPS staging origin |
   | `SEO_API_URL` | API origin, for example `https://api.muvira.in` | Staging API origin |
   | `SEO_INDEXING_ENABLED` | `true` after validation | `false` |
   | `SEO_INTERNAL_TOKEN` | Shared secret from step 1 | Separate staging secret |
   | `PORT` | `80` in Docker; platform-assigned in Nixpacks | Platform-assigned |

   Origins must not contain paths, query strings, user information or trailing API prefixes. `SEO_API_URL` is required (the existing `VITE_API_URL` environment value is accepted as a fallback). Indexing defaults to **disabled**. The host refuses to start without a sufficiently long token. An internal HTTP API origin is supported for private service networking; public traffic should use HTTPS.
4. Deploy the frontend image/service and validate the checklist below. Only `siteUrl` and `indexingEnabled` are injected as public runtime configuration. Development can use `VITE_SITE_URL` and `VITE_SEO_INDEXING_ENABLED`; these are build-time public values and never carry credentials.

For a token rotation, coordinate both services during a low-traffic window. A mismatch falls back to the ordinary API quota and can cause upstream rate limits, which the frontend returns as 503. Rolling back the API alone before the frontend also removes the increased catalog quota.

## Docker and Nixpacks

Build the frontend from the repository root with `client/Dockerfile`, using the existing public Vite build arguments (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_REDIRECT_URL`, and optional store name). Inject the four SEO variables at **container runtime**. The final image uses Node 20 and listens on port 80. `/healthz` returns `ok`; it is a liveness probe and does not assert API availability.

The root `docker-compose.yml` passes the shared token to both services and the public indexing/site settings to the frontend at runtime. Its API origin defaults to the private `http://server:4000` service address; set `SEO_API_URL` when the frontend should use a different reachable origin. Compose indexing defaults to disabled. Set production indexing explicitly after acceptance.

For Nixpacks, select `client/nixpacks.toml` from the repository root and supply the same runtime values plus existing Vite build values. Start command: `node client/scripts/serve-static.mjs`. The root `nixpacks.toml` remains the API configuration. The Node host handles www-to-apex 308 redirects, gzip, MIME types, immutable hashed assets, and missing-asset 404s. The retained nginx config is a legacy static-host reference and cannot supply dynamic metadata.

## Cloudflare and proxy checks

- Route `muvira.in` and `www.muvira.in` to the Node host. Ensure the origin receives the original Host header so www redirects preserve the complete path and query. Use the same canonical apex origin in `SITE_URL`.
- Bypass edge caching for all HTML routes, `/index.html`, `/robots.txt`, and `/sitemap.xml`. Remove any Cache Everything/page rules or Workers that replace them with the SPA document. Purge cached HTML and the old sitemap response during rollout. Honor `no-store`, `X-Robots-Tag`, response status and `Retry-After`.
- Keep long caching for hashed `/assets/*` and confirm a missing asset returns 404 with a non-HTML response. The host supports gzip; Cloudflare may negotiate a different client compression format.
- Check that WAF/bot settings permit legitimate crawlers to request public product pages and the sitemap. Avoid a Cloudflare-managed robots policy overriding the origin response. Test the public edge response, not only the origin.
- Confirm the API edge also honors product `no-store`. Never cache product price/stock HTML at the edge. Catalog failure is 503, not an empty 200 or a permanent 404.

## Acceptance checks before enabling indexing

Use a JavaScript-disabled browser or `curl -i` against the actual domain:

- `/`: exact approved title and description; one title, description, keywords, canonical, robots, OG set and Twitter large-image card. Locale is `en_IN`. Default editorial image is HTTPS and 1536 × 1024. Product images omit dimensions because the catalog does not expose verified sizes.
- `/product/<active-slug>`: correct title/default or override, genuine images and SKU, current INR decimal price from integer paisa, and correct `InStock`/`OutOfStock`. Active out-of-stock products remain indexable. No invented ratings are included. Confirm current price against the visible purchase panel.
- `/shop?category=<active-nonempty-slug>` and its valid `&page=2`: distinct collection metadata and self-referencing page canonicals. Pagination renders anchor URLs and ordinary clicks preserve results scrolling; modified clicks open normally. Filters/search/sort are noindex, while tracking parameters do not change the canonical.
- `/category/<slug>?page=2&inStock=true` and `/categories/<slug>`: 308 to `/shop?category=<slug>` preserving applicable query parameters. `/categories` remains the directory.
- Empty collections: 200 with noindex. Missing/inactive products or categories and invalid/out-of-range catalog pages: 404 with noindex. Search, cart, auth, account, checkout, orders, admin and error routes: noindex.
- Simulated API failure/timeout/redirect: product/catalog page responds 503 with `Retry-After: 60`; the head is noindex. Do not simulate failures on production shared infrastructure.
- Navigate from a product to home, a collection and another product: no duplicated tags or stale Product JSON-LD. Loading the initial application must preserve the host-provided head while metadata refreshes.
- `/robots.txt`: plain text; production allows crawling and staging disallows it. Both name the sitemap at the configured origin. `/sitemap.xml`: XML, includes active products and nonempty active collections, excludes private/filter/search/empty URLs. `lastmod` comes only from genuine catalog timestamps; static routes omit an invented date.
- Validate initial HTML and product markup using [Google Rich Results Test](https://search.google.com/test/rich-results), then check a live product using Search Console URL Inspection. Breadcrumb schema matches the displayed Home → Shop → collection → product hierarchy. Google may choose its own search-result title/description; these fields do not guarantee ranking or rich-result eligibility.

Submit `https://muvira.in/sitemap.xml` in the verified Google Search Console property after acceptance. Inspect the sitemap fetch and a few product/collection URLs after rollout, then monitor indexing, crawl errors, 5xx and API rate limits. Search-result changes take recrawling; do not repeatedly change metadata based on the first result.

## Copy and merchant editing

The homepage prioritizes god idols and puja. Category metadata uses each real collection name/description; product defaults use the actual name and short description. Material descriptions must remain faithful: “marble-finish resin” must never become “marble.” Names and descriptions should be corrected in the catalog when the underlying facts change.

The existing product editor exposes optional SEO title, SEO description and comma-separated SEO keywords. Existing overrides survive unrelated edits; clearing a field restores its automatic default. Aim for roughly 50–60 title characters and 140–160 description characters when practical, without sacrificing clarity. The keyword tag is included as requested; [Google explicitly ignores meta keywords for indexing and ranking](https://developers.google.com/search/docs/crawling-indexing/special-tags). Product schema follows [Google's merchant listing guidance](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing).

The dated [competitor comparison](competitor-comparison-2026-10-28.md) records availability and raw metadata evidence. Copy is original, not copied from competitors.

## Rollback

Keep the prior API/frontend image references and runtime configuration in the deployment record. To stop indexing a new staging deployment, set `SEO_INDEXING_ENABLED=false`, restart the frontend host, and purge its cached HTML/robots/sitemap at the edge. This is not a substitute for a production incident rollback: it intentionally requests deindexing.

For an application incident, restore the prior frontend image and its matching environment; purge HTML/robots/sitemap caches again and verify health/assets/navigation. The prior static frontend may have generic metadata and an HTML sitemap response, so record that SEO regression and restore the new host after correction. The API changes are additive; keep them until all new frontend instances have been rolled back, then roll back the API if needed. No database rollback is necessary. Do not roll back catalog merchant edits implicitly; preserve them in the database.
