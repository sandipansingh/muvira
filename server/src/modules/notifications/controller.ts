import type { Request, Response, NextFunction } from 'express'
import * as service from './service'

export async function getPreferences(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const prefs = await service.getUserPrefs(req.user!.id)
    res.json({ success: true, data: prefs })
  } catch (err) {
    next(err)
  }
}

export async function updatePreferences(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const prefs = await service.updateUserPrefs(req.user!.id, req.body)
    res.json({ success: true, data: prefs })
  } catch (err) {
    next(err)
  }
}

export async function adminListNotificationLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query['page'] as string) || 1
    const limit = parseInt(req.query['limit'] as string) || 20
    const orderId = req.query['orderId'] as string | undefined
    const result = await service.adminListNotificationLogs({ page, limit, orderId })
    res.json({ success: true, data: result.logs, meta: { page, limit, total: result.total } })
  } catch (err) {
    next(err)
  }
}
