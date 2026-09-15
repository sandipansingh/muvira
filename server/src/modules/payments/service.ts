import crypto from 'crypto'
import { adminSupabase } from '../../lib/supabase/admin'
import { razorpay } from '../../lib/razorpay/client'
import { verifyPaymentSignature, verifyWebhookSignature } from '../../lib/razorpay/verifySignature'
import { logger } from '../../lib/logger'
import { databaseError, isPostgrestNoRows } from '../../lib/databaseError'
import { deleteCacheByPattern } from '../../config/cache'
import { invalidateOn } from '../../services/cacheInvalidation'
import { AppError } from '../../types'
import type { Order } from '../../types'
import {
  RazorpayWebhookPaymentSchema,
  type RazorpayWebhookPayment,
  type VerifyPaymentInput,
} from './schema'

interface LocalPayment {
  id: string
  order_id: string
  razorpay_order_id: string
  amount_paisa: number
  currency: string
  status: string
}

interface FinalizeResult {
  already_captured: boolean
  order: Order
}

async function getOwnedPayment(userId: string, razorpayOrderId: string): Promise<LocalPayment> {
  const { data: payment, error } = await adminSupabase
    .from('payments')
    .select('id, order_id, razorpay_order_id, amount_paisa, currency, status')
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (error && !isPostgrestNoRows(error))
    throw databaseError('payments.get_owned', error, 'Failed to fetch payment')
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')

  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .select('user_id')
    .eq('id', payment.order_id)
    .single()

  if (orderError && !isPostgrestNoRows(orderError))
    throw databaseError('payments.get_order_owner', orderError, 'Failed to fetch payment')
  if (!order || order.user_id !== userId) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')
  }

  return payment as LocalPayment
}

async function writePaymentLog(
  payment: LocalPayment,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await adminSupabase.from('payment_logs').insert({
    payment_id: payment.id,
    order_id: payment.order_id,
    event_type: eventType,
    payload,
  })
  if (error) logger.error({ error, orderId: payment.order_id }, 'Failed to write payment audit log')
}

async function finalizePayment(
  payment: LocalPayment,
  providerPaymentId: string,
  signature: string,
  amountPaisa: number,
  currency: string,
  method: string
): Promise<FinalizeResult> {
  const { data, error } = await adminSupabase.rpc('finalize_captured_payment', {
    p_razorpay_order_id: payment.razorpay_order_id,
    p_razorpay_payment_id: providerPaymentId,
    p_razorpay_signature: signature,
    p_amount_paisa: amountPaisa,
    p_currency: currency,
    p_payment_method: method,
  })

  if (error || !data) {
    logger.error({ error, orderId: payment.order_id }, 'Atomic payment finalization failed')
    throw new AppError(
      409,
      'PAYMENT_RECONCILIATION_REQUIRED',
      'Payment was received but the order requires reconciliation. Please contact support.'
    )
  }

  const result = data as unknown as FinalizeResult
  invalidateOn('ORDER_PLACED', {
    id: result.order.id,
    userId: result.order.user_id,
  })
  return result
}

export async function verifyPayment(
  userId: string,
  input: VerifyPaymentInput
): Promise<{ order: Order; alreadyCaptured: boolean }> {
  const payment = await getOwnedPayment(userId, input.razorpay_order_id)
  await writePaymentLog(payment, 'verify_attempt', {
    razorpay_order_id: input.razorpay_order_id,
  })

  if (!verifyPaymentSignature(input)) {
    await writePaymentLog(payment, 'verify_failure', {
      razorpay_order_id: input.razorpay_order_id,
      reason: 'signature_mismatch',
    })
    throw new AppError(400, 'PAYMENT_SIGNATURE_INVALID', 'Payment verification failed')
  }

  try {
    const [providerPayment, providerOrder] = await Promise.all([
      razorpay.payments.fetch(input.razorpay_payment_id),
      razorpay.orders.fetch(input.razorpay_order_id),
    ])

    const providerMatches =
      providerPayment.id === input.razorpay_payment_id &&
      providerPayment.order_id === input.razorpay_order_id &&
      Number(providerPayment.amount) === payment.amount_paisa &&
      providerPayment.currency === payment.currency &&
      providerPayment.status === 'captured' &&
      providerPayment.captured === true &&
      providerOrder.id === input.razorpay_order_id &&
      Number(providerOrder.amount) === payment.amount_paisa &&
      providerOrder.currency === payment.currency &&
      providerOrder.status === 'paid' &&
      Number(providerOrder.amount_paid) === payment.amount_paisa

    if (!providerMatches) {
      await writePaymentLog(payment, 'verify_failure', {
        razorpay_order_id: input.razorpay_order_id,
        reason: 'provider_state_mismatch',
      })
      throw new AppError(409, 'PAYMENT_STATE_MISMATCH', 'Payment is not confirmed by Razorpay')
    }

    const result = await finalizePayment(
      payment,
      providerPayment.id,
      input.razorpay_signature,
      Number(providerPayment.amount),
      providerPayment.currency,
      providerPayment.method
    )

    return { order: result.order, alreadyCaptured: result.already_captured }
  } catch (error) {
    if (error instanceof AppError) throw error
    logger.error({ error, orderId: payment.order_id }, 'Failed to fetch Razorpay payment state')
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'Payment verification is delayed. Please try again.'
    )
  }
}

async function registerWebhook(
  rawBody: Buffer,
  payload: Record<string, unknown>,
  providerEventId?: string
): Promise<{ id: string; duplicate: boolean }> {
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  const eventId = providerEventId?.trim() || payloadHash
  const eventType = typeof payload['event'] === 'string' ? payload['event'] : null
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .insert({
      source: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      raw_payload: payload,
      processing_status: 'verified',
    })
    .select('id')
    .single()

  if (error?.code === '23505') return { id: '', duplicate: true }
  if (error)
    throw databaseError('payments.register_webhook', error, 'Webhook could not be recorded', {
      code: 'WEBHOOK_AUDIT_FAILED',
    })
  if (!data) throw new AppError(500, 'WEBHOOK_AUDIT_FAILED', 'Webhook could not be recorded')
  return { id: data.id as string, duplicate: false }
}

async function setWebhookStatus(
  webhookId: string,
  status: 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const { error } = await adminSupabase
    .from('webhook_events')
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage?.slice(0, 2000) ?? null,
    })
    .eq('id', webhookId)
  if (error) logger.error({ error, webhookId }, 'Failed to update webhook audit state')
}

export function parseRazorpayWebhookPayment(
  payload: Record<string, unknown>
): RazorpayWebhookPayment | undefined {
  const wrapper = payload['payload'] as Record<string, unknown> | undefined
  const paymentWrapper = wrapper?.['payment'] as Record<string, unknown> | undefined
  const parsed = RazorpayWebhookPaymentSchema.safeParse(paymentWrapper?.['entity'])
  return parsed.success ? parsed.data : undefined
}

export async function processRazorpayWebhook(
  rawBody: Buffer,
  signature: string,
  payload: Record<string, unknown>,
  providerEventId?: string
): Promise<{ status: 'processed' | 'duplicate' | 'ignored' }> {
  if (!verifyWebhookSignature({ rawBody, signature })) {
    throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature')
  }

  const registered = await registerWebhook(rawBody, payload, providerEventId)
  if (registered.duplicate) return { status: 'duplicate' }

  const event = typeof payload['event'] === 'string' ? payload['event'] : ''
  const providerPayment = parseRazorpayWebhookPayment(payload)

  try {
    if (event === 'payment.captured') {
      if (
        !providerPayment?.id ||
        !providerPayment.order_id ||
        providerPayment.status !== 'captured' ||
        providerPayment.captured !== true
      ) {
        throw new AppError(400, 'WEBHOOK_MALFORMED', 'Malformed captured-payment webhook')
      }

      const { data: localPayment } = await adminSupabase
        .from('payments')
        .select('id, order_id, razorpay_order_id, amount_paisa, currency, status')
        .eq('razorpay_order_id', providerPayment.order_id)
        .single()
      if (!localPayment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')

      await finalizePayment(
        localPayment as LocalPayment,
        providerPayment.id,
        '',
        Number(providerPayment.amount),
        providerPayment.currency,
        providerPayment.method
      )
      await setWebhookStatus(registered.id, 'processed')
      return { status: 'processed' }
    }

    if (event === 'payment.failed') {
      if (!providerPayment?.order_id) {
        throw new AppError(400, 'WEBHOOK_MALFORMED', 'Malformed failed-payment webhook')
      }

      const { data: localPayment } = await adminSupabase
        .from('payments')
        .select('order_id')
        .eq('razorpay_order_id', providerPayment.order_id)
        .single()
      if (localPayment) {
        const { error } = await adminSupabase.rpc('fail_checkout', {
          p_order_id: localPayment.order_id,
          p_reason: providerPayment.error_description ?? 'Payment failed',
        })
        if (error) throw error
        deleteCacheByPattern('GET:/api/products')
      }
      await setWebhookStatus(registered.id, 'processed')
      return { status: 'processed' }
    }

    await setWebhookStatus(registered.id, 'processed')
    return { status: 'ignored' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await setWebhookStatus(registered.id, 'failed', message)
    throw error
  }
}
