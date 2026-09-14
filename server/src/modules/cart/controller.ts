import type { Request, Response, NextFunction } from 'express'
import * as service from './service'

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await service.getCart(req.user!.id)
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await service.addToCart(req.user!.id, req.body)
    res.status(201).json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function updateCartItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await service.updateCartItem(
      req.user!.id,
      req.params['itemId'] as string,
      req.body
    )
    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function removeFromCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await service.removeFromCart(req.user!.id, req.params['itemId'] as string)
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.clearCart(req.user!.id)
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}
