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

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.createCheckoutOrder(req.user!.id, req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.cancelCheckout(req.user!.id, req.body.order_id as string)
    res.json({ success: true, data: null })
  } catch (error) {
    next(error)
  }
}
