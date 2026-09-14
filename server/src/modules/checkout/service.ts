import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import { validateCoupon } from '../coupons/service'
import type { CheckoutQuoteInput, ShippingMethod } from './schema'

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

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to load shipping methods')

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

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch cart')
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
