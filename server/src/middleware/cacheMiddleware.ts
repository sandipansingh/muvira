/**
 * cacheMiddleware.ts — Reusable Express middleware factory for response caching.
 *
 * Purpose:
 *   Wraps public GET routes with an in-memory caching layer. On the first
 *   request for a URL the handler runs normally; subsequent requests within
 *   the TTL window are served from cache without hitting Supabase.
 *
 * Factory function:
 *   `cacheMiddleware(ttl)` — returns an Express RequestHandler configured
 *   with the supplied time-to-live (in seconds).
 *
 * Key generation:
 *   `<METHOD>:<originalUrl>` — e.g. "GET:/api/products?sort=newest&page=2"
 *   The full originalUrl (including query string) is used so that different
 *   filter combinations never collide.
 *
 * HIT path:
 *   Returns the cached body immediately with header `X-Cache: HIT` and the
 *   appropriate `Cache-Control` header. Supabase is never contacted.
 *
 * MISS path:
 *   Intercepts the response by overriding `res.json()` on the response
 *   instance. The payload is stored in NodeCache before being forwarded
 *   to the client. The response carries `X-Cache: MISS`.
 *
 * Skip conditions — caching is bypassed ONLY when:
 *   - Request method is not GET  (mutations are never cached)
 *   - `CACHE_ENABLED=false` env flag is set
 *
 * ⚠️  DO NOT check for the Authorization header here.
 *   Many frontends send JWT tokens on every request, including public ones.
 *   Checking for the header would silently bypass the cache for all such
 *   requests — even on routes that don't require auth. Instead, only apply
 *   this middleware on genuinely public routes (no requireAuth in the chain).
 *
 * Failure policy:
 *   All cache operations delegate to `getCache`/`setCache` which never throw.
 *   A cache failure falls through transparently — the route handler still runs.
 *
 * @param ttl - Cache lifetime in seconds for this route.
 * @returns   Express `RequestHandler`.
 *
 * @example
 *   // Cache the product list for 5 minutes
 *   router.get("/", cacheMiddleware(300), controller.listProducts);
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getCache, setCache } from "../config/cache";
import { logger } from "../lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape stored in NodeCache for each cached response. */
interface CachedResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  cachedAt: number; // Unix ms — used to compute X-Cache-Age on HITs
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * buildCacheKey — Derives a stable cache key from the current request.
 *
 * Uses `req.originalUrl` (not `req.url`) so the key always contains the
 * complete path + query string even when the router is mounted at a prefix.
 *
 * Example: "GET:/api/products?category=men&sort=newest&page=1"
 */
function buildCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}`;
}

/**
 * shouldSkipCache — Returns true when caching must be bypassed.
 *
 * Only skips non-GET methods. Authenticated routes are handled by NOT
 * applying this middleware to them in the route files — not by inspecting
 * the Authorization header here (which would break public routes that
 * receive a token from the client anyway).
 */
function shouldSkipCache(req: Request): boolean {
  return req.method !== "GET";
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function cacheMiddleware(ttl: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // ── Skip logic ───────────────────────────────────────────────────────────
    if (shouldSkipCache(req)) {
      next();
      return;
    }

    const cacheKey = buildCacheKey(req);

    // ── HIT ──────────────────────────────────────────────────────────────────
    const cached = getCache<CachedResponse>(cacheKey);

    if (cached !== null) {
      const ageSeconds = Math.round((Date.now() - cached.cachedAt) / 1000);

      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Age", `${ageSeconds}s`);
      res.setHeader("Cache-Control", "no-cache");

      logger.info(
        { cacheKey, ageSeconds },
        "[CACHE] HIT — serving from cache",
      );

      // Send the cached response directly — no Supabase call
      res.status(cached.status).json(cached.body);
      return;
    }

    // ── MISS — intercept res.json() to capture & store the response ──────────
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "no-cache");

    // Keep a reference to Express's real res.json before patching
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalJson = res.json.bind(res);

    // Override res.json on this specific response object only.
    // The override is removed immediately after the first call so it cannot
    // interfere with any subsequent response methods.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).json = function patchedJson(body: any): Response {
      // Restore the original immediately — prevents double-interception
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res as any).json = originalJson;

      // Only cache 2xx responses; never store error bodies
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entry: CachedResponse = {
          status: res.statusCode,
          body,
          cachedAt: Date.now(),
        };

        setCache<CachedResponse>(cacheKey, entry, ttl);

        logger.info(
          { cacheKey, ttl, status: res.statusCode },
          "[CACHE] MISS — response stored",
        );
      }

      // Delegate to the real res.json to actually send the response
      return originalJson(body);
    };

    next();
  };
}
