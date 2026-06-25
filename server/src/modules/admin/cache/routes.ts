import { Router } from 'express'
import type { Request, Response } from 'express'
import { getCacheStats, flushCache } from '../../../config/cache'
import { logger } from '../../../lib/logger'

export const adminCacheRouter = Router()

adminCacheRouter.get('/stats', (req: Request, res: Response): void => {
  const stats = getCacheStats()

  if (!stats) {
    res.status(500).json({
      success: false,
      error: { code: 'CACHE_ERROR', message: 'Failed to retrieve cache stats' },
    })
    return
  }

  const total = stats.hits + stats.misses
  const hitRate = total === 0 ? '0%' : `${((stats.hits / total) * 100).toFixed(1)}%`

  logger.info({ requestId: req.requestId, cacheStats: stats }, '[CACHE] Admin fetched cache stats')

  res.json({
    success: true,
    data: {
      ...stats,
      hitRate,
    },
  })
})

adminCacheRouter.delete('/flush', (req: Request, res: Response): void => {
  logger.warn(
    { requestId: req.requestId, adminId: req.user?.id },
    '[CACHE] Admin initiated cache flush'
  )

  flushCache()

  res.json({
    success: true,
    data: { message: 'Cache flushed successfully' },
  })
})
