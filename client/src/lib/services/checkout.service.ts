import { api } from '../api/client'
import type {
  CheckoutCoupon,
  CheckoutQuote,
  CheckoutQuoteItem,
  ShippingMethod,
  ShippingOption,
  CreateCheckoutOrderInput,
  CheckoutPaymentSession,
} from '../../types/checkout'
import type { PaymentConfiguration, RazorpaySuccessResponse } from '../../types/razorpay'

interface RawPaymentSession {
  checkout_request_id: string | null
  order_id: string
  order_number: string
  razorpay_order_id: string | null
  key_id: string
  amount_paisa: number
  currency: 'INR'
  expires_at: string | null
  retention_deadline_at: string | null
  server_time: string
  state: CheckoutPaymentSession['state']
  can_pay: boolean
  snapshot: {
    items: Array<{
      product_id: string
      product_name: string
      product_image_url: string | null
      quantity: number
      unit_price_paisa: number
      total_price_paisa: number
    }>
    subtotal_paisa: number
    discount_amount_paisa: number
    shipping_amount_paisa: number
    tax_amount_paisa: number
    coupon_code: string | null
    shipping_method: string
    contact_email: string
    shipping: {
      full_name: string
      phone: string
      line1: string
      line2: string | null
      city: string
      state: string
      pincode: string
    }
  }
}

function mapPaymentSession(raw: RawPaymentSession): CheckoutPaymentSession {
  return {
    checkoutRequestId: raw.checkout_request_id,
    orderId: raw.order_id,
    orderNumber: raw.order_number,
    razorpayOrderId: raw.razorpay_order_id,
    razorpayKeyId: raw.key_id,
    amountPaisa: raw.amount_paisa,
    currency: raw.currency,
    expiresAt: raw.expires_at,
    retentionDeadlineAt: raw.retention_deadline_at,
    serverTime: raw.server_time,
    state: raw.state,
    canPay: raw.can_pay,
    snapshot: {
      items: raw.snapshot.items.map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        productImage: item.product_image_url,
        quantity: item.quantity,
        unitPricePaisa: item.unit_price_paisa,
        totalPricePaisa: item.total_price_paisa,
      })),
      subtotalPaisa: raw.snapshot.subtotal_paisa,
      discountAmountPaisa: raw.snapshot.discount_amount_paisa,
      shippingAmountPaisa: raw.snapshot.shipping_amount_paisa,
      taxAmountPaisa: raw.snapshot.tax_amount_paisa,
      couponCode: raw.snapshot.coupon_code,
      shippingMethod: raw.snapshot.shipping_method,
      contactEmail: raw.snapshot.contact_email,
      shipping: {
        fullName: raw.snapshot.shipping.full_name,
        phone: raw.snapshot.shipping.phone,
        line1: raw.snapshot.shipping.line1,
        line2: raw.snapshot.shipping.line2,
        city: raw.snapshot.shipping.city,
        state: raw.snapshot.shipping.state,
        pincode: raw.snapshot.shipping.pincode,
      },
    },
  }
}

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
  delivery_available: boolean | null
  estimated_delivery_days: number | null
  is_preview: boolean
  shipping_methods: Record<
    ShippingMethod,
    {
      enabled: boolean
      label: string
      description: string
      amount_paisa: number
      available: boolean | null
      estimated_delivery_days: number | null
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
    available: option.available,
    estimatedDeliveryDays: option.estimated_delivery_days,
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
    deliveryAvailable: raw.delivery_available,
    estimatedDeliveryDays: raw.estimated_delivery_days,
    isPreview: raw.is_preview,
    shippingMethods: {
      standard: mapShippingOption(raw.shipping_methods.standard),
      express: mapShippingOption(raw.shipping_methods.express),
    },
  }
}

export const checkoutService = {
  async reportPaymentError(
    orderId: string,
    metadata: Record<string, string>,
    expectedUserId: string
  ): Promise<void> {
    await api.post(
      `/api/checkout/${encodeURIComponent(orderId)}/payment-error`,
      metadata,
      true,
      expectedUserId
    )
  },
  async initializeAttempt(requestId: string, expectedUserId: string): Promise<void> {
    await api.post(
      '/api/checkout/attempts',
      { checkout_request_id: requestId },
      true,
      expectedUserId
    )
  },
  async request(requestId: string, expectedUserId: string): Promise<CheckoutPaymentSession | null> {
    const response = await api.get<{ success: true; data: RawPaymentSession | null }>(
      `/api/checkout/requests/${encodeURIComponent(requestId)}`,
      true,
      expectedUserId
    )
    return response.data ? mapPaymentSession(response.data) : null
  },
  async paymentConfig(expectedUserId?: string): Promise<PaymentConfiguration> {
    const response = await api.get<{
      success: true
      data: { key_id: string } & Omit<PaymentConfiguration, 'keyId'>
    }>('/api/checkout/payment-config', true, expectedUserId)
    return { keyId: response.data.key_id, mode: response.data.mode, upi: response.data.upi }
  },
  async active(expectedUserId?: string): Promise<CheckoutPaymentSession | null> {
    const response = await api.get<{ success: true; data: RawPaymentSession | null }>(
      '/api/checkout/active',
      true,
      expectedUserId
    )
    return response.data ? mapPaymentSession(response.data) : null
  },
  async prepare(
    input: CreateCheckoutOrderInput & { checkoutRequestId: string },
    expectedUserId?: string
  ): Promise<CheckoutPaymentSession> {
    const response = await api.post<{ success: true; data: RawPaymentSession }>(
      '/api/checkout/create-order',
      {
        checkout_request_id: input.checkoutRequestId,
        address_id: input.addressId,
        shipping_method: input.shippingMethod,
        billing_same_as_shipping: input.billingSameAsShipping,
        ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
        ...(!input.billingSameAsShipping && input.billing
          ? {
              billing: {
                full_name: input.billing.fullName,
                address_line1: input.billing.line1,
                address_line2: input.billing.line2 || undefined,
                city: input.billing.city,
                state: input.billing.state,
                pincode: input.billing.pincode,
                country: input.billing.country,
                gst_number: input.billing.gstNumber || undefined,
              },
            }
          : {}),
      },
      true,
      expectedUserId
    )
    return mapPaymentSession(response.data)
  },
  async reconcile(orderId: string, expectedUserId?: string): Promise<CheckoutPaymentSession> {
    const response = await api.post<{ success: true; data: RawPaymentSession }>(
      `/api/checkout/${encodeURIComponent(orderId)}/reconcile`,
      {},
      true,
      expectedUserId
    )
    return mapPaymentSession(response.data)
  },
  async verify(response: RazorpaySuccessResponse, expectedUserId?: string): Promise<void> {
    await api.post(
      '/api/payments/verify',
      {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      },
      true,
      expectedUserId
    )
  },
  async quote(
    shippingMethod: ShippingMethod,
    couponCode?: string,
    addressId?: string,
    expectedUserId?: string
  ): Promise<CheckoutQuote> {
    const response = await api.post<{ success: true; data: RawCheckoutQuote }>(
      '/api/checkout/quote',
      {
        shipping_method: shippingMethod,
        ...(couponCode ? { coupon_code: couponCode } : {}),
        ...(addressId ? { address_id: addressId } : {}),
      },
      true,
      expectedUserId
    )

    return mapQuote(response.data)
  },
}
