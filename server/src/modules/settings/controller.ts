import type { Request, Response, NextFunction } from 'express'
import * as service from './service'

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await service.getSettings()
    res.json({ success: true, data: settings })
  } catch (err) {
    next(err)
  }
}

export async function adminUpdateSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await service.updateSettings(req.body)
    res.json({ success: true, data: settings })
  } catch (err) {
    next(err)
  }
}
