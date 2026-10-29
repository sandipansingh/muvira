import { createHash } from 'node:crypto'
import { adminSupabase } from '../../lib/supabase/admin'
import { razorpay, RazorpayRequestError } from '../../lib/razorpay/client'
import { assertPaymentEnvironment, paymentEnvironmentArgs } from '../../services/paymentEnvironment'
import { env } from '../../config/env'
import { AppError } from '../../types'
import { databaseError, isPostgrestNoRows } from '../../lib/databaseError'
import { executionLeaseRpcArgs, withExecutionLease } from '../../services/executionLease'
import { inspectRetainedCheckoutProvider } from '../../services/retainedCheckout'
import { inspectCheckoutProviderState } from './service'
import { recordPaymentReconciliation } from '../payments/service'
import { deleteCacheByPattern } from '../../config/cache'
import { logger } from '../../lib/logger'
import type { CreateCheckoutOrderInput, PaymentDiagnosticSchema } from './schema'
import type { z } from 'zod'
import { verifyCheckoutShipping } from './shipping'
import type {
  CheckoutPaymentSession,
  CheckoutPreparation,
  SessionOrder,
  CheckoutSessionState,
} from '../../types/checkoutSession'

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    )
  return value
}

export async function recordPaymentDiagnostic(
  userId: string,
  orderId: string,
  input: z.infer<typeof PaymentDiagnosticSchema>,
  requestId?: string
): Promise<void> {
  const order = await ownedOrder(userId, orderId)
  if (input.orderId && input.orderId !== order.payments[0]?.razorpay_order_id)
    throw new AppError(
      400,
      'PAYMENT_DIAGNOSTIC_MISMATCH',
      'Payment reference does not match this purchase'
    )
  const { error } = await adminSupabase.from('payment_logs').insert({
    order_id: orderId,
    event_type: 'client_payment_error',
    payload: { ...input, mode: env.RAZORPAY_MODE, requestId },
  })
  if (error)
    throw databaseError('checkout.diagnostic', error, 'Payment diagnostic could not be recorded')
}

async function ownedOrder(userId: string, orderId: string): Promise<SessionOrder> {
  const { data, error } = await adminSupabase
    .from('orders')
    .select('*, order_items (*), payments (razorpay_order_id, amount_paisa, currency, status)')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error && !isPostgrestNoRows(error))
    throw databaseError('checkout.session_order', error, 'Unable to load checkout')
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Checkout not found')
  const order = data as unknown as SessionOrder
  order.payments = Array.isArray(data.payments)
    ? data.payments
    : data.payments
      ? [data.payments]
      : []
  return order
}

async function preparationFor(orderId: string): Promise<CheckoutPreparation | null> {
  const { data, error } = await adminSupabase
    .from('checkout_preparations')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error)
    throw databaseError('checkout.session_preparation', error, 'Unable to load payment preparation')
  return data as CheckoutPreparation | null
}

async function paymentSession(
  order: SessionOrder,
  preparation: CheckoutPreparation | null,
  state?: CheckoutSessionState
): Promise<CheckoutPaymentSession> {
  const { data: retention, error } = await adminSupabase
    .from('retained_checkout_cases')
    .select('retention_deadline_at')
    .eq('order_id', order.id)
    .maybeSingle()
  if (error)
    throw databaseError('checkout.session_retention', error, 'Unable to load payment status')
  const providerId = order.payments[0]?.razorpay_order_id ?? null
  const currentState =
    order.payment_status === 'paid'
      ? 'paid'
      : order.status !== 'pending' || order.payment_status !== 'pending'
        ? 'released'
        : (state ??
          (providerId
            ? 'pending'
            : preparation?.dispatch_state === 'initialized'
              ? 'preparing'
              : 'review'))
  return {
    checkout_request_id: preparation?.request_id ?? null,
    order_id: order.id,
    order_number: order.order_number,
    razorpay_order_id: providerId,
    key_id: env.RAZORPAY_KEY_ID,
    amount_paisa: order.total_amount_paisa,
    currency: 'INR',
    expires_at: order.checkout_expires_at,
    retention_deadline_at: retention?.retention_deadline_at ?? null,
    server_time: new Date().toISOString(),
    state: currentState,
    can_pay:
      currentState === 'payable' &&
      !!providerId &&
      new Date(order.checkout_expires_at ?? 0).getTime() > Date.now(),
    snapshot: {
      items: order.order_items.map(
        ({
          product_id,
          product_name,
          product_image_url,
          quantity,
          unit_price_paisa,
          total_price_paisa,
        }) => ({
          product_id,
          product_name,
          product_image_url,
          quantity,
          unit_price_paisa,
          total_price_paisa,
        })
      ),
      subtotal_paisa: order.subtotal_paisa,
      discount_amount_paisa: order.discount_amount_paisa,
      shipping_amount_paisa: order.shipping_amount_paisa,
      tax_amount_paisa: order.tax_amount_paisa,
      coupon_code: order.coupon_code,
      shipping_method: order.shipping_method,
      contact_email: order.contact_email,
      shipping: {
        full_name: order.shipping_full_name,
        phone: order.shipping_phone,
        line1: order.shipping_address_line1,
        line2: order.shipping_address_line2,
        city: order.shipping_city,
        state: order.shipping_state,
        pincode: order.shipping_pincode,
      },
    },
  }
}

async function markInitializationReview(orderId: string, providerOrderId?: string): Promise<void> {
  const { error: markError } = await adminSupabase
    .from('checkout_preparations')
    .update({
      dispatch_state: 'review',
      ...(providerOrderId ? { provider_order_id: providerOrderId } : {}),
    })
    .eq('order_id', orderId)
    .eq('dispatch_state', 'dispatched')
  const { error: alertError } = await adminSupabase.rpc('persist_operational_alert', {
    p_alert_type: 'checkout_initialization_unknown',
    p_severity: 'critical',
    p_source: 'checkout',
    p_reference_id: orderId,
    p_message: 'Payment setup needs reconciliation before another order may be created.',
    p_details: { provider_order_id: providerOrderId ?? null },
    p_order_id: orderId,
    p_webhook_event_id: null,
  })
  if (markError || alertError)
    logger.fatal(
      { orderId, markError, alertError },
      'Checkout initialization recovery could not be persisted'
    )
  if (providerOrderId)
    await recordPaymentReconciliation({
      orderId,
      razorpayOrderId: providerOrderId,
      reason: 'Custom checkout provider order could not be attached',
    })
}

export async function initializeCheckoutAttempt(userId: string, requestId: string) {
  const { data, error } = await adminSupabase.rpc('begin_checkout_attempt', {
    p_user_id: userId,
    p_request_id: requestId,
  })
  if (error) throw databaseError('checkout.begin_attempt', error, 'Unable to start this purchase')
  return data
}

export async function getCheckoutPaymentByRequest(
  userId: string,
  requestId: string
): Promise<CheckoutPaymentSession | null> {
  const { data, error } = await adminSupabase
    .from('checkout_preparations')
    .select('order_id')
    .eq('user_id', userId)
    .eq('request_id', requestId)
    .maybeSingle()
  if (error) throw databaseError('checkout.request', error, 'Unable to recover this purchase')
  return data ? reconcileCheckoutPayment(userId, data.order_id) : null
}

export async function prepareCheckoutPayment(
  userId: string,
  input: CreateCheckoutOrderInput
): Promise<CheckoutPaymentSession> {
  const { checkout_request_id: requestId, ...checkout } = input
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(stableValue(checkout)))
    .digest('hex')
  const request = {
    p_user_id: userId,
    p_request_id: requestId,
    p_request_fingerprint: fingerprint,
  }
  const existing = await adminSupabase.rpc('lookup_checkout_preparation', request)
  if (existing.error)
    throw databaseError('checkout.lookup_preparation', existing.error, 'Unable to recover checkout')
  let data = existing.data
  if (!data) {
    const shippingVerification = await verifyCheckoutShipping(userId, checkout)
    const prepared = await adminSupabase.rpc('prepare_checkout_payment', {
      ...request,
      p_checkout: checkout,
      p_order_prefix: env.ORDER_PREFIX,
      p_shipping_verification: shippingVerification,
      ...paymentEnvironmentArgs(),
    })
    if (prepared.error || !prepared.data)
      throw databaseError('checkout.prepare', prepared.error, 'Unable to prepare checkout', {
        statusCode: ['40001', 'P0409'].includes(prepared.error?.code ?? '') ? 409 : 400,
        code: ['40001', 'P0409'].includes(prepared.error?.code ?? '')
          ? 'SHIPPING_CONTEXT_CHANGED'
          : 'CHECKOUT_INVALID',
      })
    data = prepared.data
  }
  if (data.conflict)
    throw new AppError(
      409,
      String(data.conflict),
      'This purchase needs your attention. Retry its recovery or explicitly start a new order.'
    )
  const orderId = String(data.order_id)
  return dispatchPreparedOrder(userId, orderId)
}

async function dispatchPreparedOrder(
  userId: string,
  orderId: string
): Promise<CheckoutPaymentSession> {
  let order = await ownedOrder(userId, orderId)
  let preparation = await preparationFor(orderId)
  if (order.payment_status !== 'pending' || order.status !== 'pending')
    return paymentSession(order, preparation)
  if (preparation?.dispatch_state !== 'initialized')
    return reconcileCheckoutPayment(userId, orderId)
  await assertPaymentEnvironment(orderId)
  await withExecutionLease('checkout_payment', orderId, async ({ lease, assertOwned }) => {
    const { data: claimed, error: claimError } = await adminSupabase.rpc(
      'claim_checkout_dispatch',
      { p_order_id: orderId, ...executionLeaseRpcArgs(lease) }
    )
    if (claimError)
      throw databaseError('checkout.dispatch', claimError, 'Unable to prepare secure payment')
    if (!claimed) return
    let providerOrderId: string | undefined
    try {
      const provider = await razorpay.orders.create({
        amount: order.total_amount_paisa,
        currency: 'INR',
        receipt: order.order_number,
        notes: { local_order_id: order.id },
        payment: {
          capture: 'automatic',
          capture_options: {
            automatic_expiry_period: 12,
            manual_expiry_period: 7200,
            refund_speed: 'normal',
          },
        },
      })
      providerOrderId = provider.id
      if (
        !/^order_[A-Za-z0-9]+$/.test(provider.id) ||
        Number(provider.amount) !== order.total_amount_paisa ||
        provider.currency !== 'INR'
      )
        throw new Error('Provider order did not match checkout')
      await assertOwned()
      const { error: attachError } = await adminSupabase.rpc('complete_checkout_payment', {
        p_user_id: userId,
        p_order_id: order.id,
        p_provider_order_id: provider.id,
        ...executionLeaseRpcArgs(lease),
        ...paymentEnvironmentArgs(),
      })
      if (attachError) throw attachError
    } catch (error) {
      const definitive =
        !providerOrderId && error instanceof RazorpayRequestError && error.definitive
      const safeCode =
        error instanceof RazorpayRequestError ? error.code : 'LOCAL_ATTACHMENT_FAILED'
      const result = await adminSupabase.rpc('record_checkout_setup_failure', {
        p_order_id: orderId,
        p_definitive: definitive,
        p_code: safeCode,
        p_provider_order_id: providerOrderId ?? null,
        ...executionLeaseRpcArgs(lease),
      })
      logger.warn(
        {
          orderId,
          providerOrderId,
          mode: env.RAZORPAY_MODE,
          stage: providerOrderId ? 'attachment' : 'order_creation',
          code: safeCode,
          definitive,
        },
        'Payment setup failed'
      )
      if (!definitive || result.error) await markInitializationReview(orderId, providerOrderId)
      if (definitive && !result.error)
        throw new AppError(
          502,
          'CHECKOUT_SETUP_REJECTED',
          'Payment setup was rejected. Retry this purchase after the payment configuration is corrected.'
        )
    }
  })
  deleteCacheByPattern('GET:/api/products')
  order = await ownedOrder(userId, orderId)
  preparation = await preparationFor(orderId)
  return paymentSession(order, preparation, order.payments.length ? 'payable' : 'review')
}

export async function getActiveCheckoutPayment(
  userId: string
): Promise<CheckoutPaymentSession | null> {
  const { data, error } = await adminSupabase.rpc('active_checkout_ids', { p_user_id: userId })
  if (error) throw databaseError('checkout.active', error, 'Unable to recover checkout')
  if (!Array.isArray(data) || !data.length) return null
  if (data.length > 1)
    throw new AppError(
      409,
      'MULTIPLE_ACTIVE_CHECKOUTS',
      'Several payments need confirmation. Open your orders before starting another payment.'
    )
  const order = await ownedOrder(userId, String(data[0]))
  return paymentSession(order, await preparationFor(order.id))
}

const inspections = new Map<string, { until: number; result: Promise<CheckoutPaymentSession> }>()

export async function reconcileCheckoutPayment(
  userId: string,
  orderId: string
): Promise<CheckoutPaymentSession> {
  const order = await ownedOrder(userId, orderId)
  if (order.payment_status !== 'pending' || order.status !== 'pending')
    return paymentSession(order, await preparationFor(orderId))
  const key = `${userId}:${orderId}`
  const existing = inspections.get(key)
  if (existing && existing.until > Date.now()) return existing.result
  if (inspections.size > 1000) {
    for (const [entryKey, value] of inspections)
      if (value.until <= Date.now()) inspections.delete(entryKey)
  }
  const result = reconcileOwnedOrder(order)
    .then((session) => {
      if (session.can_pay) {
        const entry = inspections.get(key)
        if (entry?.result === result) entry.until = 0
      }
      return session
    })
    .catch((error: unknown) => {
      inspections.delete(key)
      throw error
    })
  inspections.set(key, { until: Date.now() + 5000, result })
  return result
}

async function reconcileOwnedOrder(order: SessionOrder): Promise<CheckoutPaymentSession> {
  let preparation = await preparationFor(order.id)
  if (order.payment_status !== 'pending' || order.status !== 'pending')
    return paymentSession(order, preparation)
  try {
    await assertPaymentEnvironment(order.id)
  } catch {
    return paymentSession(order, preparation, 'review')
  }
  if (!order.payments.length) {
    if (preparation?.dispatch_state === 'initialized')
      return dispatchPreparedOrder(order.user_id, order.id)
    if (!preparation) return paymentSession(order, preparation, 'review')
    try {
      await withExecutionLease('checkout_payment', order.id, async ({ lease }) => {
        const found = await razorpay.orders.all({ receipt: order.order_number, count: 2 })
        const matches = found.items.filter(
          (candidate) =>
            candidate.receipt === order.order_number &&
            candidate.notes?.local_order_id === order.id &&
            Number(candidate.amount) === order.total_amount_paisa &&
            candidate.currency === 'INR'
        )
        if (matches.length !== 1 || found.items.length !== 1) return
        const { error } = await adminSupabase.rpc('complete_checkout_payment', {
          p_user_id: order.user_id,
          p_order_id: order.id,
          p_provider_order_id: matches[0]!.id,
          ...executionLeaseRpcArgs(lease),
          ...paymentEnvironmentArgs(),
        })
        if (error) await markInitializationReview(order.id, matches[0]!.id)
      })
      order = await ownedOrder(order.user_id, order.id)
      preparation = await preparationFor(order.id)
    } catch {
      return paymentSession(order, preparation, 'review')
    }
    if (!order.payments.length) return paymentSession(order, preparation, 'review')
  }
  const payment = order.payments[0]!
  const inspection = await inspectRetainedCheckoutProvider({
    razorpayOrderId: payment.razorpay_order_id,
    amountPaisa: payment.amount_paisa,
    currency: payment.currency,
    inspectPaymentAttempts: true,
  })
  let state: CheckoutSessionState =
    inspection.classification === 'payable'
      ? 'payable'
      : inspection.classification === 'pending'
        ? 'pending'
        : 'review'
  if (
    inspection.classification === 'captured' ||
    inspection.classification === 'terminal_unpaid' ||
    new Date(order.checkout_expires_at ?? 0).getTime() <= Date.now()
  ) {
    try {
      await withExecutionLease('checkout_payment', order.id, ({ lease }) =>
        inspectCheckoutProviderState({ id: order.id, payments: order.payments }, lease, {
          inspection,
        })
      )
      order = await ownedOrder(order.user_id, order.id)
    } catch {
      state = 'review'
    }
  }
  return paymentSession(order, preparation, state)
}
