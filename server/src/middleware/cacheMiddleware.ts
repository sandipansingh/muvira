import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { getCache, setCache } from '../config/cache'
import { logger } from '../lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CachedResponse {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  cachedAt: number // Unix ms — used to compute X-Cache-Age on HITs
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}`
}

function shouldSkipCache(req: Request): boolean {
  return req.method !== 'GET'
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function cacheMiddleware(ttl: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // ── Skip logic ───────────────────────────────────────────────────────────
    if (shouldSkipCache(req)) {
      next()
      return
    }

    const cacheKey = buildCacheKey(req)

    // ── HIT ──────────────────────────────────────────────────────────────────
    const cached = getCache<CachedResponse>(cacheKey)

    if (cached !== null) {
      const ageSeconds = Math.round((Date.now() - cached.cachedAt) / 1000)

      res.setHeader('X-Cache', 'HIT')
      res.setHeader('X-Cache-Age', `${ageSeconds}s`)
      res.setHeader('Cache-Control', 'no-cache')

      logger.info({ cacheKey, ageSeconds }, '[CACHE] HIT — serving from cache')

      // Send the cached response directly — no Supabase call
      res.status(cached.status).json(cached.body)
      return
    }

    // ── MISS — intercept res.json() to capture & store the response ──────────
    res.setHeader('X-Cache', 'MISS')
    res.setHeader('Cache-Control', 'no-cache')

    // Keep a reference to Express's real res.json before patching
     
    const originalJson = res.json.bind(res)

    // Override res.json on this specific response object only.
    // The override is removed immediately after the first call so it cannot
    // interfere with any subsequent response methods.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any).json = function patchedJson(body: any): Response {
      // Restore the original immediately — prevents double-interception
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(res as any).json = originalJson

      // Only cache 2xx responses; never store error bodies
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entry: CachedResponse = {
          status: res.statusCode,
          body,
          cachedAt: Date.now(),
        }

        setCache<CachedResponse>(cacheKey, entry, ttl)

        logger.info({ cacheKey, ttl, status: res.statusCode }, '[CACHE] MISS — response stored')
      }

      // Delegate to the real res.json to actually send the response
      return originalJson(body)
    }

    next()
  }
}
