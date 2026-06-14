import type { Request, Response, NextFunction } from 'express'
import * as service from './service'

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Identity always comes from the verified JWT via requireAuth
    const profile = await service.getProfile(req.user!.id)
    res.json({ success: true, data: profile })
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await service.updateProfile(req.user!.id, req.body)
    res.json({ success: true, data: profile })
  } catch (err) {
    next(err)
  }
}
