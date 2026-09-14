import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { logger } from '../../lib/logger'
import { AppError } from '../../types'

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await service.verifyPayment(req.user!.id, req.body)
    res.json({
      success: true,
      data: {
        order_id: result.order.id,
        order_number: result.order.order_number,
        status: result.order.status,
        payment_status: result.order.payment_status,
        already_captured: result.alreadyCaptured,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature']

    if (!signature || typeof signature !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Razorpay-Signature header' },
      })
      return
    }

    if (!req.rawBody) {
      logger.error('Webhook handler received no rawBody - check express.raw() middleware ordering')
      throw new AppError(500, 'INTERNAL', 'Raw body not available for signature verification')
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(req.rawBody.toString('utf8')) as Record<string, unknown>
    } catch {
      throw new AppError(400, 'WEBHOOK_MALFORMED', 'Webhook body is not valid JSON')
    }

    const eventIdHeader = req.headers['x-razorpay-event-id']
    const providerEventId = typeof eventIdHeader === 'string' ? eventIdHeader : undefined
    const result = await service.processRazorpayWebhook(
      req.rawBody,
      signature,
      payload,
      providerEventId
    )

    res.json({ success: true, data: { status: result.status } })
  } catch (err) {
    next(err)
  }
}
