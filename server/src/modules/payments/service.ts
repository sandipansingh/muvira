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

interface ClaimedWebhook {
  id: string
  raw_payload: Record<string, unknown>
  processing_token: string
}

const RECONCILIATION_WRITE_ATTEMPTS = 3
const WEBHOOK_ENQUEUE_ATTEMPTS = 3

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

export async function recordPaymentReconciliation(input: {
  orderId: string
  paymentId?: string
  razorpayOrderId: string
  razorpayPaymentId?: string
  providerAmount?: number
  providerCurrency?: string
  reason: string
}): Promise<boolean> {
  for (let attempt = 1; attempt <= RECONCILIATION_WRITE_ATTEMPTS; attempt += 1) {
    let error: unknown
    try {
      const result = await adminSupabase.rpc('record_payment_reconciliation', {
        p_order_id: input.orderId,
        p_payment_id: input.paymentId ?? null,
        p_razorpay_order_id: input.razorpayOrderId,
        p_razorpay_payment_id: input.razorpayPaymentId ?? null,
        p_reason: input.reason,
      })
      error = result.error
    } catch (rpcError) {
      error = rpcError
    }
    if (!error) return true

    if (attempt < RECONCILIATION_WRITE_ATTEMPTS) {
      logger.warn(
        {
          error,
          attempt,
          orderId: input.orderId,
          razorpayOrderId: input.razorpayOrderId,
        },
        'Retrying payment reconciliation persistence'
      )
      await wait(50 * 2 ** (attempt - 1))
      continue
    }

    logger.fatal(
      {
        alert: 'payment_reconciliation_persistence_failed',
        error,
        attempts: attempt,
        orderId: input.orderId,
        paymentId: input.paymentId,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        providerAmount: input.providerAmount,
        providerCurrency: input.providerCurrency,
        reason: input.reason,
        occurredAt: new Date().toISOString(),
      },
      'CRITICAL: captured or orphaned provider payment reference has no reconciliation row'
    )
    return false
  }

  return false
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
    const reconciliationRecorded = await recordPaymentReconciliation({
      orderId: payment.order_id,
      paymentId: payment.id,
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: providerPaymentId,
      providerAmount: amountPaisa,
      providerCurrency: currency,
      reason: `Captured payment could not be finalized: ${error?.message ?? 'empty finalization result'}`,
    })
    if (!reconciliationRecorded) {
      throw new AppError(
        503,
        'PAYMENT_RECONCILIATION_PERSISTENCE_FAILED',
        'Payment was received but recovery could not be recorded. Please contact support.'
      )
    }
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
      const providerShowsCapturedFunds =
        providerPayment.status === 'captured' ||
        providerPayment.captured === true ||
        providerOrder.status === 'paid' ||
        Number(providerOrder.amount_paid) > 0

      if (providerShowsCapturedFunds) {
        const reconciliationRecorded = await recordPaymentReconciliation({
          orderId: payment.order_id,
          paymentId: payment.id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: providerPayment.id,
          providerAmount: Number(providerPayment.amount),
          providerCurrency: providerPayment.currency,
          reason: 'Captured provider state did not match the local payment contract',
        })
        if (!reconciliationRecorded) {
          throw new AppError(
            503,
            'PAYMENT_RECONCILIATION_PERSISTENCE_FAILED',
            'Payment was received but recovery could not be recorded. Please contact support.'
          )
        }
        throw new AppError(
          409,
          'PAYMENT_RECONCILIATION_REQUIRED',
          'Payment was received but the order requires reconciliation. Please contact support.'
        )
      }

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

    return { id: existing.id as string, duplicate: false }
  }
  if (error)
    throw databaseError('payments.register_webhook', error, 'Webhook could not be recorded', {
      code: 'WEBHOOK_AUDIT_FAILED',
    })
  if (!data) throw new AppError(500, 'WEBHOOK_AUDIT_FAILED', 'Webhook could not be recorded')
  return { id: data.id as string, duplicate: false }
}

async function claimRazorpayWebhook(webhookId: string): Promise<ClaimedWebhook | null> {
  const { data, error } = await adminSupabase.rpc('claim_razorpay_webhook', {
    p_webhook_id: webhookId,
    p_lease_seconds: 120,
  })
  if (error) {
    throw databaseError('payments.claim_webhook', error, 'Webhook could not be claimed', {
      code: 'WEBHOOK_AUDIT_FAILED',
    })
  }

  const claimed = Array.isArray(data) ? data[0] : data
  if (!claimed) return null
  return claimed as unknown as ClaimedWebhook
}

async function completeRazorpayWebhook(webhookId: string, processingToken: string): Promise<void> {
  const { data, error } = await adminSupabase.rpc('complete_razorpay_webhook', {
    p_webhook_id: webhookId,
    p_processing_token: processingToken,
  })
  if (error || data !== true) {
    throw databaseError(
      'payments.complete_webhook',
      error,
      'Webhook completion could not be persisted',
      { code: 'WEBHOOK_AUDIT_FAILED' }
    )
  }
}

async function failRazorpayWebhook(
  webhookId: string,
  processingToken: string,
  errorMessage: string
): Promise<void> {
  const { data, error } = await adminSupabase.rpc('fail_razorpay_webhook', {
    p_webhook_id: webhookId,
    p_processing_token: processingToken,
    p_error: errorMessage.slice(0, 2000),
  })
  if (error || data !== true) {
    throw databaseError('payments.fail_webhook', error, 'Webhook failure could not be persisted', {
      code: 'WEBHOOK_AUDIT_FAILED',
    })
  }
}

function startWebhookLeaseHeartbeat(
  webhookId: string,
  processingToken: string
): {
  assertOwned: () => Promise<void>
  stop: () => Promise<void>
} {
  let stopped = false
  let leaseLost = false
  let renewal: Promise<void> | null = null

  const renew = async (): Promise<void> => {
    if (stopped || leaseLost) return
    const { data, error } = await adminSupabase.rpc('renew_razorpay_webhook_lease', {
      p_webhook_id: webhookId,
      p_processing_token: processingToken,
      p_lease_seconds: 120,
    })
    if (error || data !== true) leaseLost = true
  }

  const scheduleRenewal = (): void => {
    if (renewal || stopped || leaseLost) return
    renewal = renew().finally(() => {
      renewal = null
    })
  }

  const timer = setInterval(scheduleRenewal, 30_000)
  timer.unref()

  return {
    assertOwned: async () => {
      if (renewal) await renewal
      if (!leaseLost) await renew()
      if (leaseLost) {
        throw new AppError(409, 'WEBHOOK_LEASE_LOST', 'Webhook processing lease is no longer owned')
      }
    },
    stop: async () => {
      stopped = true
      clearInterval(timer)
      if (renewal) await renewal
    },
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

export async function enqueueRazorpayWebhookRetry(webhookId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= WEBHOOK_ENQUEUE_ATTEMPTS; attempt += 1) {
    let error: unknown
    try {
      const result = await adminSupabase.rpc('enqueue_retry_job', {
        p_job_type: 'razorpay_webhook',
        p_reference_id: webhookId,
        p_payload: { webhookId },
        p_max_retries: 10,
      })
      error = result.error
    } catch (rpcError) {
      error = rpcError
    }
    if (!error) return true

    if (attempt < WEBHOOK_ENQUEUE_ATTEMPTS) {
      logger.warn({ error, webhookId, attempt }, 'Retrying Razorpay webhook retry enqueue')
      await wait(50 * 2 ** (attempt - 1))
      continue
    }

    logger.fatal(
      {
        alert: 'razorpay_webhook_retry_enqueue_failed',
        error,
        webhookId,
        attempts: attempt,
        occurredAt: new Date().toISOString(),
      },
      'CRITICAL: failed Razorpay webhook is visible but could not be queued for retry'
    )
    return false
  }

  return false
}

async function cancelFailedPaymentCheckout(
  providerPayment: RazorpayWebhookPayment,
  assertLeaseOwned: () => Promise<void>
): Promise<void> {
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
    logger.info(
      {
        orderId: localPayment.order_id,
        razorpayOrderId: localPayment.razorpay_order_id,
        providerOrderStatus: providerOrder.status,
      },
      'Failed payment webhook retained checkout reservations due to captured or in-progress state'
    )
    return
  }
  if (currentProviderPayment.status !== 'failed') {
    throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Payment failure is not confirmed by Razorpay')
  }

  const providerOrderStatus = String(providerOrder.status).toLowerCase()
  const providerOrderIsExhausted = ['cancelled', 'closed', 'expired', 'failed'].includes(
    providerOrderStatus
  )
  if (!providerOrderIsExhausted) {
    logger.info(
      {
        orderId: localPayment.order_id,
        razorpayOrderId: localPayment.razorpay_order_id,
        providerOrderStatus,
      },
      'Failed payment attempt retained checkout reservations because provider order accepts retries'
    )
    return
  }

  await assertLeaseOwned()

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
  processingToken: string,
  payload: Record<string, unknown>
): Promise<{ status: 'processed' | 'ignored' }> {
  const event = typeof payload['event'] === 'string' ? payload['event'] : ''
  const providerPayment = parseRazorpayWebhookPayment(payload)
  const heartbeat = startWebhookLeaseHeartbeat(webhookId, processingToken)

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

      await heartbeat.assertOwned()
      await finalizePayment(
        localPayment as LocalPayment,
        providerPayment.id,
        '',
        Number(providerPayment.amount),
        providerPayment.currency,
        providerPayment.method
      )
      await heartbeat.assertOwned()
      await heartbeat.stop()
      await completeRazorpayWebhook(webhookId, processingToken)
      return { status: 'processed' }
    }

    if (event === 'payment.failed') {
      if (!providerPayment?.id || !providerPayment.order_id) {
        throw new AppError(400, 'WEBHOOK_MALFORMED', 'Malformed failed-payment webhook')
      }
      await cancelFailedPaymentCheckout(providerPayment, heartbeat.assertOwned)
      await heartbeat.assertOwned()
      await heartbeat.stop()
      await completeRazorpayWebhook(webhookId, processingToken)
      return { status: 'processed' }
    }

    await heartbeat.assertOwned()
    await heartbeat.stop()
    await completeRazorpayWebhook(webhookId, processingToken)
    return { status: 'ignored' }
  } catch (error) {
    await heartbeat.stop()
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await failRazorpayWebhook(webhookId, processingToken, message)
    throw error
  }
}

export async function processStoredRazorpayWebhook(webhookId: string): Promise<void> {
  const event = await claimRazorpayWebhook(webhookId)
  if (!event) return
  await processVerifiedRazorpayWebhook(webhookId, event.processing_token, event.raw_payload)
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

  const claimed = await claimRazorpayWebhook(registered.id)
  if (!claimed) return { status: 'duplicate' }

  try {
    return await processVerifiedRazorpayWebhook(
      registered.id,
      claimed.processing_token,
      claimed.raw_payload
    )
  } catch (error) {
    const enqueued = await enqueueRazorpayWebhookRetry(registered.id)
    if (!enqueued) {
      throw new AppError(
        503,
        'WEBHOOK_RETRY_UNAVAILABLE',
        'Webhook processing failed and automatic recovery could not be queued'
      )
    }
    throw error
  }
}
