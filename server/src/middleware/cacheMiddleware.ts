/**
 * cacheMiddleware.ts — Reusable Express middleware factory for response caching.
 *
 * Purpose:
 *   Wraps public GET routes with an in-memory caching layer.  On the first
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
 *   appropriate `Cache-Control` header.  Supabase is never contacted.
 *
 * MISS path:
 *   Monkey-patches `res.json()` to intercept the serialised payload after the
 *   route handler runs.  The payload is stored in NodeCache before being sent
 *   to the client.  The response carries `X-Cache: MISS`.
 *
 * Skip conditions — caching is bypassed when:
 *   - Request method is not GET.
 *   - An `Authorization` header is present (authenticated / user-specific data).
 *   - `CACHE_ENABLED=false` env flag is set (getCache/setCache become no-ops).
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
  body: unknown;
  cachedAt: number; // Unix ms — lets us log cache age on HITs
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * buildCacheKey — Derives a cache key from the current request.
 *
 * Uses `req.originalUrl` (not `req.url`) so the key always contains the
 * complete path + query string even when the router is mounted at a prefix.
 */
function buildCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}`;
}

/**
 * shouldSkipCache — Returns true when caching must be bypassed.
 *
 * We skip for:
 *  - Non-GET methods  (mutations must never be cached)
 *  - Authenticated requests  (user-specific data must stay private)
 */
function shouldSkipCache(req: Request): boolean {
  if (req.method !== "GET") return true;
  if (req.headers.authorization) return true;
  return false;
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
      // Instruct downstream caches / browsers to honour our TTL
      res.setHeader("Cache-Control", `public, max-age=${ttl}`);

      logger.debug(
        { cacheKey, ageSeconds },
        "[CACHE] HIT — serving from cache",
      );

      res.status(cached.status).json(cached.body);
      return;
    }

    // ── MISS — intercept res.json() ──────────────────────────────────────────
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", `public, max-age=${ttl}`);

    // Save a reference to the original res.json so we can restore it
    const originalJson = res.json.bind(res) as (body?: unknown) => Response;

    // Patch res.json on this response instance only
    res.json = function patchedJson(body?: unknown): Response {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entry: CachedResponse = {
          status: res.statusCode,
          body,
          cachedAt: Date.now(),
        };

        setCache<CachedResponse>(cacheKey, entry, ttl);

        logger.debug(
          { cacheKey, ttl, status: res.statusCode },
          "[CACHE] MISS — response cached",
        );
      }

      // Restore and call the real json() so the response is actually sent
      res.json = originalJson;
      return originalJson(body);
    };

    next();
  };
}
