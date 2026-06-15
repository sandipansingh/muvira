import NodeCache from 'node-cache'
import { logger } from '../lib/logger'

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false'

const CACHE_DEBUG = process.env.CACHE_DEBUG === 'true' || process.env.NODE_ENV === 'development'

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false,
})

// Print once at startup so you can confirm the cache module loaded correctly
// regardless of pino log level. Remove in production if noisy.
console.log(`[CACHE] Initialized — enabled=${CACHE_ENABLED} debug=${CACHE_DEBUG} stdTTL=300s`)

function debugLog(action: string, key: string, meta?: object): void {
  if (!CACHE_DEBUG) return
  // Use INFO level (not debug) so these always appear when CACHE_DEBUG=true,
  // even when LOG_LEVEL is left at its default "info".
  logger.info({ cacheAction: action, cacheKey: key, ...meta }, `[CACHE] ${action}: ${key}`)
}

export function getCache<T>(key: string): T | null {
  if (!CACHE_ENABLED) return null
  try {
    const value = cache.get<T>(key)
    if (value === undefined) {
      debugLog('MISS', key)
      return null
    }
    debugLog('HIT', key)
    return value
  } catch (err) {
    logger.error({ err, cacheKey: key }, '[CACHE] getCache error — falling through to DB')
    return null
  }
}

export function setCache<T>(key: string, value: T, ttl = 0): void {
  if (!CACHE_ENABLED) return
  try {
    // NodeCache treats ttl=0 as "use the instance default"
    cache.set(key, value, ttl)
    debugLog('SET', key, { ttl: ttl || 'default' })
  } catch (err) {
    logger.error({ err, cacheKey: key }, '[CACHE] setCache error — data not cached')
  }
}

export function deleteCache(keys: string | string[]): void {
  if (!CACHE_ENABLED) return
  try {
    const targets = Array.isArray(keys) ? keys : [keys]
    cache.del(targets)
    targets.forEach((k) => debugLog('DELETE', k))
  } catch (err) {
    logger.error({ err, cacheKeys: keys }, '[CACHE] deleteCache error')
  }
}

export function deleteCacheByPattern(prefix: string): void {
  if (!CACHE_ENABLED) return
  try {
    const allKeys = cache.keys()
    const matches = allKeys.filter((k) => k.startsWith(prefix))
    if (matches.length > 0) {
      cache.del(matches)
      matches.forEach((k) => debugLog('DELETE_PATTERN', k, { prefix }))
    }
  } catch (err) {
    logger.error({ err, prefix }, '[CACHE] deleteCacheByPattern error')
  }
}

export function getCacheStats() {
  try {
    const stats = cache.getStats()
    const keys = cache.keys()
    return {
      enabled: CACHE_ENABLED,
      hits: stats.hits,
      misses: stats.misses,
      keys: keys.length,
      // NodeCache doesn't expose raw memory; we estimate via V8 heap stats
      memoryUsageBytes: process.memoryUsage().heapUsed,
      keyList: keys, // useful for debugging; strip in prod if desired
    }
  } catch (err) {
    logger.error({ err }, '[CACHE] getCacheStats error')
    return null
  }
}

export function flushCache(): void {
  try {
    cache.flushAll()
    logger.warn('[CACHE] Cache flushed by admin')
  } catch (err) {
    logger.error({ err }, '[CACHE] flushCache error')
  }
}
