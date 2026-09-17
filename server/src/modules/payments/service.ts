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

interface RegisteredWebhook {
  id: string
  duplicate: boolean
}

export async function recordPaymentReconciliation(input: {
  orderId: string
  paymentId?: string
  razorpayOrderId: string
  razorpayPaymentId?: string
  reason: string
}): Promise<boolean> {
  const { error } = await adminSupabase.rpc('record_payment_reconciliation', {
    p_order_id: input.orderId,
    p_payment_id: input.paymentId ?? null,
    p_razorpay_order_id: input.razorpayOrderId,
    p_razorpay_payment_id: input.razorpayPaymentId ?? null,
    p_reason: input.reason,
  })
  if (error) {
    logger.error(
      { error, orderId: input.orderId, razorpayOrderId: input.razorpayOrderId },
      'Failed to persist payment reconciliation case'
    )
    return false
  }
  return true
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
    await recordPaymentReconciliation({
      orderId: payment.order_id,
      paymentId: payment.id,
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: providerPaymentId,
      reason: `Captured payment could not be finalized: ${error?.message ?? 'empty finalization result'}`,
    })
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
): Promise<RegisteredWebhook> {
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

  if (error?.code === '23505') {
    const { data: existing, error: existingError } = await adminSupabase
      .from('webhook_events')
      .select('id, processing_status')
      .eq('source', 'razorpay')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existingError || !existing) {
      throw databaseError(
        'payments.load_duplicate_webhook',
        existingError,
        'Webhook could not be recovered',
        { code: 'WEBHOOK_AUDIT_FAILED' }
      )
    }
    if (existing.processing_status === 'processed' || existing.processing_status === 'duplicate') {
      return { id: existing.id as string, duplicate: true }
    }

    const { error: resetError } = await adminSupabase
      .from('webhook_events')
      .update({
        processing_status: 'verified',
        error_message: null,
        processed_at: null,
        raw_payload: payload,
      })
      .eq('id', existing.id)
    if (resetError) {
      throw databaseError(
        'payments.recover_failed_webhook',
        resetError,
        'Webhook could not be recovered',
        { code: 'WEBHOOK_AUDIT_FAILED' }
      )
    }
    return { id: existing.id as string, duplicate: false }
  }
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
  if (error) {
    throw databaseError(
      'payments.update_webhook_status',
      error,
      'Webhook status could not be persisted',
      { code: 'WEBHOOK_AUDIT_FAILED' }
    )
  }
}

export function parseRazorpayWebhookPayment(
  payload: Record<string, unknown>
): RazorpayWebhookPayment | undefined {
  const wrapper = payload['payload'] as Record<string, unknown> | undefined
  const paymentWrapper = wrapper?.['payment'] as Record<string, unknown> | undefined
  const parsed = RazorpayWebhookPaymentSchema.safeParse(paymentWrapper?.['entity'])
  return parsed.success ? parsed.data : undefined
}

async function enqueueRazorpayWebhookRetry(webhookId: string): Promise<void> {
  const { error } = await adminSupabase.rpc('enqueue_retry_job', {
    p_job_type: 'razorpay_webhook',
    p_reference_id: webhookId,
    p_payload: { webhookId },
    p_max_retries: 10,
  })
  if (error) {
    logger.error({ error, webhookId }, 'Failed to enqueue Razorpay webhook retry')
  }
}

async function cancelFailedPaymentCheckout(providerPayment: RazorpayWebhookPayment): Promise<void> {
  const { data: localPayment, error } = await adminSupabase
    .from('payments')
    .select('id, order_id, razorpay_order_id, amount_paisa, currency, status')
    .eq('razorpay_order_id', providerPayment.order_id)
    .maybeSingle()
  if (error) {
    throw databaseError(
      'payments.load_failed_webhook_payment',
      error,
      'Failed to load local payment'
    )
  }
  if (!localPayment) return

  const [currentProviderPayment, providerOrder] = await Promise.all([
    razorpay.payments.fetch(providerPayment.id),
    razorpay.orders.fetch(providerPayment.order_id),
  ])
  const providerIdentityMatches =
    currentProviderPayment.id === providerPayment.id &&
    currentProviderPayment.order_id === localPayment.razorpay_order_id &&
    Number(currentProviderPayment.amount) === localPayment.amount_paisa &&
    currentProviderPayment.currency === localPayment.currency &&
    providerOrder.id === localPayment.razorpay_order_id &&
    Number(providerOrder.amount) === localPayment.amount_paisa &&
    providerOrder.currency === localPayment.currency
  if (!providerIdentityMatches) {
    throw new AppError(409, 'PAYMENT_STATE_MISMATCH', 'Provider payment identity does not match')
  }

  const isCapturedOrInProgress =
    localPayment.status === 'captured' ||
    currentProviderPayment.status === 'captured' ||
    currentProviderPayment.status === 'authorized' ||
    currentProviderPayment.captured === true ||
    providerOrder.status === 'paid' ||
    Number(providerOrder.amount_paid) > 0
  if (isCapturedOrInProgress) {
    throw new AppError(
      409,
      'PAYMENT_IN_PROGRESS',
      'Payment state is still in progress and the checkout was not released'
    )
  }
  if (currentProviderPayment.status !== 'failed') {
    throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Payment failure is not confirmed by Razorpay')
  }

  const { data: released, error: releaseError } = await adminSupabase.rpc('fail_checkout', {
    p_order_id: localPayment.order_id,
    p_reason: providerPayment.error_description ?? 'Payment failed',
  })
  if (releaseError || released !== true) {
    throw new AppError(409, 'CHECKOUT_NOT_CANCELLED', 'Checkout could not be cancelled safely')
  }
  deleteCacheByPattern('GET:/api/products')
}

async function processVerifiedRazorpayWebhook(
  webhookId: string,
  payload: Record<string, unknown>
): Promise<{ status: 'processed' | 'ignored' }> {
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

      const { data: localPayment, error } = await adminSupabase
        .from('payments')
        .select('id, order_id, razorpay_order_id, amount_paisa, currency, status')
        .eq('razorpay_order_id', providerPayment.order_id)
        .single()
      if (error || !localPayment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')

      await finalizePayment(
        localPayment as LocalPayment,
        providerPayment.id,
        '',
        Number(providerPayment.amount),
        providerPayment.currency,
        providerPayment.method
      )
      await setWebhookStatus(webhookId, 'processed')
      return { status: 'processed' }
    }

    if (event === 'payment.failed') {
      if (!providerPayment?.id || !providerPayment.order_id) {
        throw new AppError(400, 'WEBHOOK_MALFORMED', 'Malformed failed-payment webhook')
      }
      await cancelFailedPaymentCheckout(providerPayment)
      await setWebhookStatus(webhookId, 'processed')
      return { status: 'processed' }
    }

    await setWebhookStatus(webhookId, 'processed')
    return { status: 'ignored' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await setWebhookStatus(webhookId, 'failed', message)
    throw error
  }
}

export async function processStoredRazorpayWebhook(webhookId: string): Promise<void> {
  const { data: event, error } = await adminSupabase
    .from('webhook_events')
    .select('source, raw_payload, processing_status')
    .eq('id', webhookId)
    .single()
  if (error || !event || event.source !== 'razorpay') {
    throw new Error('Stored Razorpay webhook was not found')
  }
  if (event.processing_status === 'processed') return
  await processVerifiedRazorpayWebhook(webhookId, event.raw_payload as Record<string, unknown>)
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

  try {
    return await processVerifiedRazorpayWebhook(registered.id, payload)
  } catch (error) {
    await enqueueRazorpayWebhookRetry(registered.id)
    throw error
  }
}
