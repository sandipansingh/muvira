/**
 * admin/cache/routes.ts — Cache management endpoints for administrators.
 *
 * These routes are mounted under /api/admin/cache (see app.ts).
 * The parent admin router applies `requireAuth` + `requireAdmin` guards
 * before this router is reached, so no additional auth middleware is needed
 * here.
 *
 * Endpoints:
 *
 *   GET    /api/admin/cache/stats
 *     Returns live NodeCache statistics: hit/miss counts, current key count,
 *     process heap usage, and the full list of live keys for debugging.
 *
 *   DELETE /api/admin/cache/flush
 *     Flushes the entire cache.  All subsequent requests will be cache misses
 *     until Supabase responses are re-cached.  This is a high-impact operation
 *     — it logs at WARN level and should be used sparingly.
 *
 * Security:
 *   - Both endpoints are admin-only (enforced by the parent router).
 *   - The flush endpoint uses DELETE method to semantically match "destroy".
 *   - Stats include a full key list which should be reviewed in production
 *     (strip if keys could leak internal data patterns).
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { getCacheStats, flushCache } from "../../../config/cache";
import { logger } from "../../../lib/logger";

export const adminCacheRouter = Router();

/**
 * GET /api/admin/cache/stats
 *
 * Returns current NodeCache metrics.
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     enabled: boolean,       // CACHE_ENABLED flag value
 *     hits: number,           // lifetime hit count
 *     misses: number,         // lifetime miss count
 *     keys: number,           // live key count
 *     memoryUsageBytes: number, // V8 heap usage (approximate)
 *     keyList: string[],      // every live cache key
 *     hitRate: string,        // formatted hit-rate percentage
 *   }
 * }
 */
adminCacheRouter.get("/stats", (req: Request, res: Response): void => {
  const stats = getCacheStats();

  if (!stats) {
    res.status(500).json({
      success: false,
      error: { code: "CACHE_ERROR", message: "Failed to retrieve cache stats" },
    });
    return;
  }

  const total = stats.hits + stats.misses;
  const hitRate =
    total === 0 ? "0%" : `${((stats.hits / total) * 100).toFixed(1)}%`;

  logger.info(
    { requestId: req.requestId, cacheStats: stats },
    "[CACHE] Admin fetched cache stats",
  );

  res.json({
    success: true,
    data: {
      ...stats,
      hitRate,
    },
  });
});

/**
 * DELETE /api/admin/cache/flush
 *
 * Evicts every key from the in-memory cache.
 * The next request for any cached resource will be a MISS and will hit
 * Supabase to repopulate.
 *
 * Response:
 * { success: true, data: { message: "Cache flushed successfully" } }
 */
adminCacheRouter.delete("/flush", (req: Request, res: Response): void => {
  logger.warn(
    { requestId: req.requestId, adminId: req.user?.id },
    "[CACHE] Admin initiated cache flush",
  );

  flushCache();

  res.json({
    success: true,
    data: { message: "Cache flushed successfully" },
  });
});
