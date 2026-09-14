import type { Request, Response, NextFunction } from 'express'
import * as service from './service'

export async function quote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.quoteCheckout(req.user!.id, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}
