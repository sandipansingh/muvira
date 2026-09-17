import { adminSupabase } from '../../lib/supabase/admin'
import { databaseError } from '../../lib/databaseError'
import { razorpay } from '../../lib/razorpay/client'
import { logger } from '../../lib/logger'
import { deleteCacheByPattern } from '../../config/cache'
import { AppError } from '../../types'
import { validateCoupon } from '../coupons/service'
import type { CheckoutQuoteInput, CreateCheckoutOrderInput, ShippingMethod } from './schema'
import { env } from '../../config/env'
import { recordPaymentReconciliation } from '../payments/service'
import { executionLeaseRpcArgs, withExecutionLease } from '../../services/executionLease'

interface CartProduct {
  id: string
  name: string
  price_paisa: number
  stock: number
  is_active: boolean
}

interface QuoteCartItem {
  product_id: string
  quantity: number
  products: CartProduct | null
}

interface ShippingMethodConfig {
  enabled: boolean
  label: string
  description: string
  charge_paisa: number
  free_threshold_paisa: number
}

const DEFAULT_SHIPPING_METHODS: Record<ShippingMethod, ShippingMethodConfig> = {
  standard: {
    enabled: true,
    label: 'Standard Shipping',
    description: '5–7 business days',
    charge_paisa: 15000,
    free_threshold_paisa: 100000,
  },
  express: {
    enabled: true,
    label: 'Express Shipping',
    description: '1–2 business days',
    charge_paisa: 9900,
    free_threshold_paisa: 0,
  },
}

async function getShippingMethods(): Promise<Record<ShippingMethod, ShippingMethodConfig>> {
  const { data, error } = await adminSupabase
    .from('site_settings')
    .select('value')
    .eq('key', 'shipping_methods')
    .maybeSingle()

  if (error)
    throw databaseError('checkout.load_shipping_methods', error, 'Failed to load shipping methods')

  const configuredMethods = data?.value as
    | Partial<Record<ShippingMethod, ShippingMethodConfig>>
    | undefined
  const methods = {
    standard: configuredMethods?.standard ?? DEFAULT_SHIPPING_METHODS.standard,
    express: configuredMethods?.express ?? DEFAULT_SHIPPING_METHODS.express,
  }

  for (const config of Object.values(methods)) {
    if (
      !Number.isInteger(config.charge_paisa) ||
      config.charge_paisa < 0 ||
      !Number.isInteger(config.free_threshold_paisa) ||
      config.free_threshold_paisa < 0
    ) {
      throw new AppError(500, 'SHIPPING_CONFIG_INVALID', 'Shipping configuration is invalid')
    }
  }

  return methods
}

async function getValidatedCart(userId: string): Promise<QuoteCartItem[]> {
  const { data, error } = await adminSupabase
    .from('cart_items')
    .select('product_id, quantity, products ( id, name, price_paisa, stock, is_active )')
    .eq('user_id', userId)

  if (error) throw databaseError('checkout.fetch_cart', error, 'Failed to fetch cart')
  if (!data || data.length === 0) throw new AppError(400, 'CART_EMPTY', 'Your cart is empty')

  const items = data as unknown as QuoteCartItem[]
  const availabilityErrors = items.flatMap((item) => {
    if (!item.products?.is_active) return ['A product is no longer available']
    if (item.quantity > item.products.stock) {
      return [`${item.products.name} has only ${item.products.stock} units available`]
    }
    return []
  })

  if (availabilityErrors.length > 0) {
    throw new AppError(409, 'CART_CHANGED', availabilityErrors.join('; '))
  }

  return items
}

export async function quoteCheckout(userId: string, input: CheckoutQuoteInput) {
  const items = await getValidatedCart(userId)
  const subtotalPaisa = items.reduce(
    (total, item) => total + (item.products?.price_paisa ?? 0) * item.quantity,
    0
  )

  let coupon = null
  let discountAmountPaisa = 0
  if (input.coupon_code) {
    const result = await validateCoupon(input.coupon_code, subtotalPaisa)
    coupon = {
      code: result.coupon.code,
      discount_type: result.coupon.discount_type,
      discount_value: result.coupon.discount_value,
      discount_amount_paisa: result.discountPaisa,
    }
    discountAmountPaisa = result.discountPaisa
  }

  const discountedSubtotalPaisa = Math.max(0, subtotalPaisa - discountAmountPaisa)
  const shippingMethods = await getShippingMethods()
  const shippingConfig = shippingMethods[input.shipping_method]
  if (!shippingConfig.enabled) {
    throw new AppError(400, 'SHIPPING_METHOD_UNAVAILABLE', 'Shipping method is unavailable')
  }

  const quoteShipping = (config: ShippingMethodConfig) => ({
    enabled: config.enabled,
    label: config.label,
    description: config.description,
    amount_paisa:
      discountedSubtotalPaisa === 0 ||
      (config.free_threshold_paisa > 0 && discountedSubtotalPaisa >= config.free_threshold_paisa)
        ? 0
        : config.charge_paisa,
  })
  const availableShippingMethods = {
    standard: quoteShipping(shippingMethods.standard),
    express: quoteShipping(shippingMethods.express),
  }
  const shippingAmountPaisa = availableShippingMethods[input.shipping_method].amount_paisa

  return {
    items: items.map((item) => ({
      product_id: item.product_id,
      product_name: item.products?.name ?? '',
      quantity: item.quantity,
      unit_price_paisa: item.products?.price_paisa ?? 0,
      line_total_paisa: (item.products?.price_paisa ?? 0) * item.quantity,
    })),
    subtotal_paisa: subtotalPaisa,
    discount_amount_paisa: discountAmountPaisa,
    shipping_amount_paisa: shippingAmountPaisa,
    tax_amount_paisa: 0,
    total_amount_paisa: discountedSubtotalPaisa + shippingAmountPaisa,
    coupon,
    shipping_method: input.shipping_method,
    shipping_label: shippingConfig.label,
    shipping_description: shippingConfig.description,
    shipping_methods: availableShippingMethods,
  }
}

interface InitializedCheckout {
  order: Record<string, unknown>
  product_ids: string[]
}

async function releaseFailedCheckout(orderId: string, reason: string): Promise<boolean> {
  const { data, error } = await adminSupabase.rpc('fail_checkout', {
    p_order_id: orderId,
    p_reason: reason,
  })
  if (error) logger.error({ error, orderId }, 'Failed to release checkout reservations')
  deleteCacheByPattern('GET:/api/products')
  return !error && data === true
}

export async function createCheckoutOrder(userId: string, input: CreateCheckoutOrderInput) {
  const { data: initializedData, error: initializeError } = await adminSupabase.rpc(
    'initialize_checkout',
    {
      p_user_id: userId,
      p_address_id: input.address_id,
      p_coupon_code: input.coupon_code ?? null,
      p_shipping_method: input.shipping_method,
      p_billing_same_as_shipping: input.billing_same_as_shipping,
      p_billing: input.billing ?? null,
      p_notes: input.notes ?? null,
      p_order_prefix: env.ORDER_PREFIX,
    }
  )

  if (initializeError || !initializedData) {
    const message = initializeError?.message ?? 'Unable to initialize checkout'
    throw new AppError(400, 'CHECKOUT_INVALID', message)
  }

  const initialized = initializedData as unknown as InitializedCheckout
  const orderId = initialized.order['id'] as string
  const orderNumber = initialized.order['order_number'] as string
  const totalAmountPaisa = initialized.order['total_amount_paisa'] as number
  deleteCacheByPattern('GET:/api/products')

  let providerOrderId: string | undefined
  let providerAmount: number | undefined
  let providerCurrency: string | undefined
  try {
    const providerOrder = await razorpay.orders.create({
      amount: totalAmountPaisa,
      currency: 'INR',
      receipt: orderNumber,
      payment: {
        capture: 'automatic',
        capture_options: {
          automatic_expiry_period: 12,
          manual_expiry_period: 7200,
          refund_speed: 'normal',
        },
      },
      notes: { local_order_id: orderId },
    })

    providerOrderId =
      typeof providerOrder.id === 'string' && providerOrder.id.trim()
        ? providerOrder.id.trim()
        : undefined
    providerAmount = Number(providerOrder.amount)
    providerCurrency = providerOrder.currency

    if (
      !providerOrderId ||
      Number(providerOrder.amount) !== totalAmountPaisa ||
      providerOrder.currency !== 'INR'
    ) {
      throw new Error('Razorpay returned an inconsistent order')
    }
    const { error: attachError } = await adminSupabase.rpc('attach_razorpay_order', {
      p_user_id: userId,
      p_order_id: orderId,
      p_razorpay_order_id: providerOrderId,
    })
    if (attachError) throw attachError

    return {
      order_id: orderId,
      order_number: orderNumber,
      razorpay_order_id: providerOrderId,
      amount_paisa: totalAmountPaisa,
      currency: 'INR',
      key_id: env.RAZORPAY_KEY_ID,
      expires_at: initialized.order['checkout_expires_at'] as string,
    }
  } catch (error) {
    logger.error(
      {
        error,
        orderId,
        razorpayOrderId: providerOrderId,
        providerAmount,
        providerCurrency,
        expectedAmountPaisa: totalAmountPaisa,
        expectedCurrency: 'INR',
        occurredAt: new Date().toISOString(),
      },
      'Razorpay checkout initialization failed'
    )
    if (providerOrderId) {
      const recorded = await recordPaymentReconciliation({
        orderId,
        razorpayOrderId: providerOrderId,
        providerAmount,
        providerCurrency,
        reason: `Razorpay order was created but could not be attached: ${
          error instanceof Error ? error.message : 'unknown persistence failure'
        }`,
      })
      if (!recorded) {
        throw new AppError(
          503,
          'PAYMENT_RECONCILIATION_REQUIRED',
          'Payment setup is being reconciled. Do not start another payment.'
        )
      }
      throw new AppError(
        503,
        'PAYMENT_RECONCILIATION_REQUIRED',
        'Payment setup requires reconciliation. Your reservation is retained; do not start another payment.'
      )
    }

    await releaseFailedCheckout(orderId, 'Payment provider initialization failed')
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'Payment is temporarily unavailable. Please try again.'
    )
  }
}

interface ExpiredCheckoutPayment {
  razorpay_order_id: string
  amount_paisa: number
  currency: string
}

interface ExpiredCheckout {
  id: string
  payments: ExpiredCheckoutPayment[] | ExpiredCheckoutPayment | null
}

function firstPayment(
  payments: ExpiredCheckoutPayment[] | ExpiredCheckoutPayment | null | undefined
): ExpiredCheckoutPayment | null {
  if (Array.isArray(payments)) return payments[0] ?? null
  return payments ?? null
}

async function persistCheckoutAlert(input: {
  orderId: string
  alertType: string
  message: string
  details: Record<string, unknown>
}): Promise<void> {
  const { error } = await adminSupabase.rpc('persist_operational_alert', {
    p_alert_type: input.alertType,
    p_severity: 'critical',
    p_source: 'checkout_expiry',
    p_reference_id: input.orderId,
    p_message: input.message,
    p_details: input.details,
    p_order_id: input.orderId,
    p_webhook_event_id: null,
  })
  if (error) logger.fatal({ error, orderId: input.orderId }, 'Checkout alert persistence failed')
}

async function retainCheckout(
  orderId: string,
  providerStatus: string,
  providerAmountPaid: number,
  reason: string,
  lease: Parameters<typeof executionLeaseRpcArgs>[0]
): Promise<void> {
  const { data, error } = await adminSupabase.rpc('retain_payable_checkout_fenced', {
    ...executionLeaseRpcArgs(lease),
    p_order_id: orderId,
    p_provider_status: providerStatus,
    p_provider_amount_paid: providerAmountPaid,
    p_reason: reason,
  })
  if (error || data !== true) {
    throw new AppError(409, 'EXECUTION_FENCED_OUT', 'Checkout retention could not be committed')
  }
}

export async function expireAbandonedCheckouts(limit = 100): Promise<{
  released: number
  retained: number
}> {
  const boundedLimit = Math.max(1, Math.min(limit, 1000))
  const { data: releasedData, error: releaseError } = await adminSupabase.rpc(
    'expire_abandoned_checkouts',
    { p_limit: boundedLimit }
  )
  if (releaseError) {
    throw databaseError('checkout.expire_unattached', releaseError, 'Checkout expiry failed')
  }

  const { data, error } = await adminSupabase
    .from('orders')
    .select('id, payments ( razorpay_order_id, amount_paisa, currency )')
    .eq('status', 'pending')
    .eq('payment_status', 'pending')
    .lt('checkout_expires_at', new Date().toISOString())
    .limit(boundedLimit)
  if (error) throw databaseError('checkout.load_expired', error, 'Checkout expiry failed')

  let retained = 0
  let released = typeof releasedData === 'number' ? releasedData : 0
  for (const checkout of (data ?? []) as unknown as ExpiredCheckout[]) {
    const payment = firstPayment(checkout.payments)
    if (!payment?.razorpay_order_id) continue

    try {
      await withExecutionLease('checkout_payment', checkout.id, async ({ lease }) => {
        let providerOrder
        try {
          providerOrder = await razorpay.orders.fetch(payment.razorpay_order_id)
        } catch (providerError) {
          await retainCheckout(
            checkout.id,
            'provider_unavailable',
            0,
            'Expired checkout retained because Razorpay state could not be verified',
            lease
          )
          await persistCheckoutAlert({
            orderId: checkout.id,
            alertType: 'checkout_expiry_provider_unavailable',
            message: 'Expired checkout retained because Razorpay state could not be verified',
            details: {
              razorpayOrderId: payment.razorpay_order_id,
              error: providerError instanceof Error ? providerError.message : String(providerError),
            },
          })
          retained += 1
          return
        }

        const amountPaid = Number(providerOrder.amount_paid)
        const providerStatus = String(providerOrder.status).toLowerCase()
        const identityMatches =
          providerOrder.id === payment.razorpay_order_id &&
          Number(providerOrder.amount) === payment.amount_paisa &&
          providerOrder.currency === payment.currency

        if (!identityMatches || !Number.isSafeInteger(amountPaid) || amountPaid < 0) {
          await retainCheckout(
            checkout.id,
            providerStatus || 'invalid_provider_response',
            Number.isSafeInteger(amountPaid) && amountPaid >= 0 ? amountPaid : 0,
            'Expired checkout retained because Razorpay state did not match the local contract',
            lease
          )
          retained += 1
          return
        }

        const terminalUnpaid =
          amountPaid === 0 && ['cancelled', 'closed', 'expired', 'failed'].includes(providerStatus)
        if (terminalUnpaid) {
          const { data: didRelease, error: fencedError } = await adminSupabase.rpc(
            'fail_checkout_fenced',
            {
              ...executionLeaseRpcArgs(lease),
              p_order_id: checkout.id,
              p_reason: `Checkout expired after provider became ${providerStatus}`,
            }
          )
          if (fencedError || didRelease !== true) {
            throw new AppError(409, 'EXECUTION_FENCED_OUT', 'Expired checkout was not released')
          }
          released += 1
          return
        }

        await retainCheckout(
          checkout.id,
          providerStatus,
          amountPaid,
          'Expired checkout retained because the Razorpay order remains payable or paid',
          lease
        )
        retained += 1
      })
    } catch (expiryError) {
      if (expiryError instanceof AppError && expiryError.code === 'EXECUTION_ALREADY_CLAIMED') {
        continue
      }
      logger.error({ expiryError, orderId: checkout.id }, 'Expired checkout inspection failed')
    }
  }

  if (released > 0) deleteCacheByPattern('GET:/api/products')
  return { released, retained }
}

export async function cancelCheckout(userId: string, orderId: string): Promise<void> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, payment_status, payments ( razorpay_order_id, amount_paisa, currency )')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  const relatedPayments = order?.payments as
    | ExpiredCheckoutPayment[]
    | ExpiredCheckoutPayment
    | null
    | undefined
  const providerOrderId = Array.isArray(relatedPayments)
    ? relatedPayments[0]?.razorpay_order_id
    : relatedPayments?.razorpay_order_id
  if (!order || !providerOrderId) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (order.payment_status === 'paid') {
    throw new AppError(409, 'PAYMENT_ALREADY_CAPTURED', 'A paid checkout cannot be cancelled')
  }

  await withExecutionLease('checkout_payment', orderId, async ({ lease }) => {
    let providerOrder
    try {
      providerOrder = await razorpay.orders.fetch(providerOrderId)
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to verify Razorpay order before cancellation')
      await retainCheckout(
        orderId,
        'provider_unavailable',
        0,
        'Customer cancellation retained because Razorpay state could not be verified',
        lease
      )
      throw new AppError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Unable to confirm cancellation')
    }

    const providerStatus = String(providerOrder.status).toLowerCase()
    const amountPaid = Number(providerOrder.amount_paid)
    const localPayment = firstPayment(relatedPayments)
    const identityMatches =
      localPayment !== null &&
      providerOrder.id === localPayment.razorpay_order_id &&
      Number(providerOrder.amount) === localPayment.amount_paisa &&
      providerOrder.currency === localPayment.currency
    if (!identityMatches || !Number.isSafeInteger(amountPaid) || amountPaid < 0) {
      await retainCheckout(
        orderId,
        providerStatus || 'invalid_provider_response',
        Number.isSafeInteger(amountPaid) && amountPaid >= 0 ? amountPaid : 0,
        'Customer cancellation retained because Razorpay state did not match the local contract',
        lease
      )
      throw new AppError(
        409,
        'PAYMENT_STATE_MISMATCH',
        'Payment state requires review. Your reservation remains held.'
      )
    }
    const terminalUnpaid =
      amountPaid === 0 && ['cancelled', 'closed', 'expired', 'failed'].includes(providerStatus)
    if (!terminalUnpaid) {
      await retainCheckout(
        orderId,
        providerStatus,
        Number.isSafeInteger(amountPaid) && amountPaid >= 0 ? amountPaid : 0,
        'Customer cancellation retained because the Razorpay order remains payable or paid',
        lease
      )
      throw new AppError(
        409,
        'PAYMENT_IN_PROGRESS',
        'Payment may still complete. Your reservation remains held while status is confirmed.'
      )
    }

    const { data: released, error } = await adminSupabase.rpc('fail_checkout_fenced', {
      ...executionLeaseRpcArgs(lease),
      p_order_id: orderId,
      p_reason: 'Customer dismissed Razorpay Checkout after provider closure',
    })
    if (error || released !== true) {
      throw new AppError(409, 'CHECKOUT_NOT_CANCELLED', 'Checkout could not be cancelled')
    }
    deleteCacheByPattern('GET:/api/products')
  })
}
