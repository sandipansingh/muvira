import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
    return
  }

  if (req.user.role !== 'admin') {
    logger.warn(
      { requestId: req.requestId, userId: req.user.id, role: req.user.role },
      'Non-admin attempted to access admin route'
    )
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    })
    return
  }

  next()
}
