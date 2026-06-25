import crypto from 'crypto'
import { env } from '../../config/env'

export function verifyPaymentSignature(params: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): boolean {
  const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  // MUST use timingSafeEqual — prevents timing-based signature forgery attacks
  try {
    const expected = Buffer.from(expectedSignature, 'utf8')
    const received = Buffer.from(params.razorpay_signature, 'utf8')

    if (expected.length !== received.length) {
      return false
    }

    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

export function verifyWebhookSignature(params: { rawBody: Buffer; signature: string }): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(params.rawBody)
    .digest('hex')

  try {
    const expected = Buffer.from(expectedSignature, 'utf8')
    const received = Buffer.from(params.signature, 'utf8')

    if (expected.length !== received.length) {
      return false
    }

    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
