import { api } from '../api/client'
import type {
  CheckoutCoupon,
  CheckoutQuote,
  CheckoutQuoteItem,
  ShippingMethod,
  ShippingOption,
} from '../../types/checkout'

interface RawCheckoutQuote {
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price_paisa: number
    line_total_paisa: number
  }>
  subtotal_paisa: number
  discount_amount_paisa: number
  shipping_amount_paisa: number
  tax_amount_paisa: number
  total_amount_paisa: number
  coupon: {
    code: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    discount_amount_paisa: number
  } | null
  shipping_method: ShippingMethod
  shipping_label: string
  shipping_description: string
  shipping_methods: Record<
    ShippingMethod,
    {
      enabled: boolean
      label: string
      description: string
      amount_paisa: number
    }
  >
}

function mapQuoteItem(item: RawCheckoutQuote['items'][number]): CheckoutQuoteItem {
  return {
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPricePaisa: item.unit_price_paisa,
    lineTotalPaisa: item.line_total_paisa,
  }
}

function mapCoupon(coupon: NonNullable<RawCheckoutQuote['coupon']>): CheckoutCoupon {
  return {
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discountAmountPaisa: coupon.discount_amount_paisa,
  }
}

function mapShippingOption(
  option: RawCheckoutQuote['shipping_methods'][ShippingMethod]
): ShippingOption {
  return {
    enabled: option.enabled,
    label: option.label,
    description: option.description,
    amountPaisa: option.amount_paisa,
  }
}

function mapQuote(raw: RawCheckoutQuote): CheckoutQuote {
  return {
    items: raw.items.map(mapQuoteItem),
    subtotalPaisa: raw.subtotal_paisa,
    discountAmountPaisa: raw.discount_amount_paisa,
    shippingAmountPaisa: raw.shipping_amount_paisa,
    taxAmountPaisa: raw.tax_amount_paisa,
    totalAmountPaisa: raw.total_amount_paisa,
    coupon: raw.coupon ? mapCoupon(raw.coupon) : null,
    shippingMethod: raw.shipping_method,
    shippingLabel: raw.shipping_label,
    shippingDescription: raw.shipping_description,
    shippingMethods: {
      standard: mapShippingOption(raw.shipping_methods.standard),
      express: mapShippingOption(raw.shipping_methods.express),
    },
  }
}

export const checkoutService = {
  async quote(shippingMethod: ShippingMethod, couponCode?: string): Promise<CheckoutQuote> {
    const response = await api.post<{ success: true; data: RawCheckoutQuote }>(
      '/api/checkout/quote',
      {
        shipping_method: shippingMethod,
        ...(couponCode ? { coupon_code: couponCode } : {}),
      },
      true
    )

    return mapQuote(response.data)
  },
}
