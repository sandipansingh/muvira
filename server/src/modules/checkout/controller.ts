import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import * as sessions from './session'
import { env } from '../../config/env'

export async function quote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.quoteCheckout(req.user!.id, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function initializeAttempt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      success: true,
      data: await sessions.initializeCheckoutAttempt(req.user!.id, req.body.checkout_request_id),
    })
  } catch (error) {
    next(error)
  }
}

export async function requestSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      success: true,
      data: await sessions.getCheckoutPaymentByRequest(
        req.user!.id,
        req.params.requestId as string
      ),
    })
  } catch (error) {
    next(error)
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = req.body.checkout_request_id
      ? await sessions.prepareCheckoutPayment(req.user!.id, req.body)
      : await service.createCheckoutOrder(req.user!.id, req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export function paymentConfig(_req: Request, res: Response): void {
  res.setHeader('Cache-Control', 'no-store')
  res.json({ success: true, data: { key_id: env.RAZORPAY_KEY_ID, currency: 'INR' } })
}

export async function active(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ success: true, data: await sessions.getActiveCheckoutPayment(req.user!.id) })
  } catch (error) {
    next(error)
  }
}

export async function reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      success: true,
      data: await sessions.reconcileCheckoutPayment(req.user!.id, req.params.orderId as string),
    })
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
