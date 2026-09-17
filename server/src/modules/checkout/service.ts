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
  const { error: expiryError } = await adminSupabase.rpc('expire_abandoned_checkouts', {
    p_limit: 100,
  })
  if (expiryError) logger.error({ expiryError }, 'Failed to expire abandoned checkouts')

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
      const released = await releaseFailedCheckout(orderId, 'Razorpay order attachment failed')
      if (!released) {
        throw new AppError(
          503,
          'PAYMENT_RECONCILIATION_REQUIRED',
          'Payment setup and reservation state require reconciliation. Do not start another payment.'
        )
      }
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_UNAVAILABLE',
        'Payment setup failed before collection. Your reservation was released.'
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

export async function cancelCheckout(userId: string, orderId: string): Promise<void> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, payment_status, payments ( razorpay_order_id )')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  const relatedPayments = order?.payments as
    | Array<{ razorpay_order_id: string }>
    | { razorpay_order_id: string }
    | null
    | undefined
  const providerOrderId = Array.isArray(relatedPayments)
    ? relatedPayments[0]?.razorpay_order_id
    : relatedPayments?.razorpay_order_id
  if (!order || !providerOrderId) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (order.payment_status === 'paid') {
    throw new AppError(409, 'PAYMENT_ALREADY_CAPTURED', 'A paid checkout cannot be cancelled')
  }

  let providerOrder
  try {
    providerOrder = await razorpay.orders.fetch(providerOrderId)
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to verify Razorpay order before cancellation')
    throw new AppError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Unable to confirm cancellation')
  }

  if (providerOrder.status !== 'created' || Number(providerOrder.amount_paid) !== 0) {
    throw new AppError(
      409,
      'PAYMENT_IN_PROGRESS',
      'Payment processing has started and cannot be cancelled yet'
    )
  }

  const { data: released, error } = await adminSupabase.rpc('fail_checkout', {
    p_order_id: orderId,
    p_reason: 'Customer dismissed Razorpay Checkout',
  })
  if (error || released !== true) {
    throw new AppError(409, 'CHECKOUT_NOT_CANCELLED', 'Checkout could not be cancelled')
  }
  deleteCacheByPattern('GET:/api/products')
}
