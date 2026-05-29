/**
 * cache.ts — Singleton NodeCache instance and helper wrappers.
 *
 * Purpose:
 *   Central place for all in-memory cache configuration.  Every module that
 *   needs to read from or write to the cache imports the four helpers below
 *   rather than talking to NodeCache directly — this keeps the surface area
 *   small and makes it easy to swap the engine later.
 *
 * Configuration:
 *   stdTTL      - Default key lifetime in seconds (overridable per-set call).
 *   checkperiod - How often NodeCache's internal sweep removes expired keys.
 *   useClones   - false → stored values are returned by reference (faster; we
 *                 treat cached data as read-only so this is safe here).
 *
 * Environment flags:
 *   CACHE_ENABLED=false → all helpers become no-ops; useful for debugging or
 *                         when running integration tests against live Supabase.
 *   CACHE_DEBUG=true    → logs every HIT / MISS / SET / DELETE to stdout.
 *
 * Failure policy:
 *   Every exported helper wraps NodeCache operations in try/catch.
 *   A cache failure NEVER throws — callers always receive `null` on error so
 *   they can transparently fall through to Supabase.
 */

import NodeCache from "node-cache";
import { logger } from "../lib/logger";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Global toggle — set CACHE_ENABLED=false to bypass the cache entirely. */
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

/** Log every HIT / MISS / SET / DELETE when true. */
const CACHE_DEBUG =
  process.env.CACHE_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

// ─── Singleton Instance ───────────────────────────────────────────────────────

/**
 * Single shared NodeCache instance.
 *
 * stdTTL      - 300 s  (5 min) default; individual setCache() calls may
 *               override this with their own TTL.
 * checkperiod - 120 s  sweep; expired keys are purged every 2 min.
 * useClones   - false  → reference semantics (no deep-clone on get/set).
 *               Callers must never mutate a value received from getCache().
 */
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false,
});

// Print once at startup so you can confirm the cache module loaded correctly
// regardless of pino log level. Remove in production if noisy.
console.log(
  `[CACHE] Initialized — enabled=${CACHE_ENABLED} debug=${CACHE_DEBUG} stdTTL=300s`,
);

// ─── Debug Logging ───────────────────────────────────────────────────────────

function debugLog(action: string, key: string, meta?: object): void {
  if (!CACHE_DEBUG) return;
  // Use INFO level (not debug) so these always appear when CACHE_DEBUG=true,
  // even when LOG_LEVEL is left at its default "info".
  logger.info({ cacheAction: action, cacheKey: key, ...meta }, `[CACHE] ${action}: ${key}`);
}

// ─── Exported Helpers ─────────────────────────────────────────────────────────

/**
 * getCache — Retrieve a value from the cache by key.
 *
 * @param key   - Namespaced cache key (e.g. "products:id:abc-123").
 * @returns     The cached value, or `null` if the key does not exist,
 *              the cache is disabled, or an error occurs.
 *
 * Cache behaviour:
 *   - Returns `null` on MISS; callers should then fetch from Supabase.
 *   - If `CACHE_ENABLED=false` always returns `null`.
 *   - Errors are logged and swallowed — never propagated.
 */
export function getCache<T>(key: string): T | null {
  if (!CACHE_ENABLED) return null;
  try {
    const value = cache.get<T>(key);
    if (value === undefined) {
      debugLog("MISS", key);
      return null;
    }
    debugLog("HIT", key);
    return value;
  } catch (err) {
    logger.error({ err, cacheKey: key }, "[CACHE] getCache error — falling through to DB");
    return null;
  }
}

/**
 * setCache — Store a value in the cache under the given key.
 *
 * @param key   - Namespaced cache key.
 * @param value - The data to cache.  Must be serialisable JSON.
 * @param ttl   - Time-to-live in seconds.  Defaults to the instance stdTTL
 *                (300 s).  Pass 0 to use the default.
 *
 * Cache behaviour:
 *   - A cache write failure is logged but never throws.
 *   - If `CACHE_ENABLED=false` this is a no-op.
 */
export function setCache<T>(key: string, value: T, ttl = 0): void {
  if (!CACHE_ENABLED) return;
  try {
    // NodeCache treats ttl=0 as "use the instance default"
    cache.set(key, value, ttl);
    debugLog("SET", key, { ttl: ttl || "default" });
  } catch (err) {
    logger.error({ err, cacheKey: key }, "[CACHE] setCache error — data not cached");
  }
}

/**
 * deleteCache — Remove one or more exact keys from the cache.
 *
 * @param keys - A single key string or an array of key strings to evict.
 *
 * Cache behaviour:
 *   - Missing keys are silently ignored by NodeCache.
 *   - Errors are logged and swallowed.
 */
export function deleteCache(keys: string | string[]): void {
  if (!CACHE_ENABLED) return;
  try {
    const targets = Array.isArray(keys) ? keys : [keys];
    cache.del(targets);
    targets.forEach((k) => debugLog("DELETE", k));
  } catch (err) {
    logger.error({ err, cacheKeys: keys }, "[CACHE] deleteCache error");
  }
}

/**
 * deleteCacheByPattern — Evict all keys whose names start with `prefix`.
 *
 * NodeCache has no native glob/pattern support, so we iterate over all
 * current keys and filter by string prefix.  This is O(n) in the number
 * of cached keys — acceptable for the key counts expected in this app.
 *
 * @param prefix - The prefix to match against (e.g. "products:category:").
 *
 * Cache behaviour:
 *   - Errors are logged and swallowed.
 *   - If `CACHE_ENABLED=false` this is a no-op.
 */
export function deleteCacheByPattern(prefix: string): void {
  if (!CACHE_ENABLED) return;
  try {
    const allKeys = cache.keys();
    const matches = allKeys.filter((k) => k.startsWith(prefix));
    if (matches.length > 0) {
      cache.del(matches);
      matches.forEach((k) => debugLog("DELETE_PATTERN", k, { prefix }));
    }
  } catch (err) {
    logger.error({ err, prefix }, "[CACHE] deleteCacheByPattern error");
  }
}

/**
 * getCacheStats — Return internal NodeCache statistics.
 *
 * Used exclusively by the admin /api/admin/cache/stats endpoint.
 * Returns hits, misses, key count, and approximate memory usage.
 */
export function getCacheStats() {
  try {
    const stats = cache.getStats();
    const keys = cache.keys();
    return {
      enabled: CACHE_ENABLED,
      hits: stats.hits,
      misses: stats.misses,
      keys: keys.length,
      // NodeCache doesn't expose raw memory; we estimate via V8 heap stats
      memoryUsageBytes: process.memoryUsage().heapUsed,
      keyList: keys, // useful for debugging; strip in prod if desired
    };
  } catch (err) {
    logger.error({ err }, "[CACHE] getCacheStats error");
    return null;
  }
}

/**
 * flushCache — Remove every key from the cache.
 *
 * Reserved for the admin flush endpoint.  Flushing is logged at warn level
 * because it's a high-impact operation that temporarily disables all caching.
 */
export function flushCache(): void {
  try {
    cache.flushAll();
    logger.warn("[CACHE] Cache flushed by admin");
  } catch (err) {
    logger.error({ err }, "[CACHE] flushCache error");
  }
}
