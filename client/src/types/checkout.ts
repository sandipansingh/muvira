export type ShippingMethod = 'standard' | 'express'

export interface ShippingOption {
  enabled: boolean
  label: string
  description: string
  amountPaisa: number
  available: boolean | null
  estimatedDeliveryDays: number | null
}

export interface CheckoutQuoteItem {
  productId: string
  productName: string
  quantity: number
  unitPricePaisa: number
  lineTotalPaisa: number
}

export interface CheckoutCoupon {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmountPaisa: number
}

export interface CheckoutQuote {
  items: CheckoutQuoteItem[]
  subtotalPaisa: number
  discountAmountPaisa: number
  shippingAmountPaisa: number
  taxAmountPaisa: number
  totalAmountPaisa: number
  coupon: CheckoutCoupon | null
  shippingMethod: ShippingMethod
  shippingLabel: string
  shippingDescription: string
  shippingMethods: Record<ShippingMethod, ShippingOption>
  deliveryAvailable: boolean | null
  estimatedDeliveryDays: number | null
  isPreview: boolean
}

export interface BillingAddressInput {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
  gstNumber?: string
}

export interface CreateCheckoutOrderInput {
  checkoutRequestId?: string
  addressId: string
  couponCode?: string
  shippingMethod: ShippingMethod
  billingSameAsShipping: boolean
  billing?: BillingAddressInput
  notes?: string
}

export interface CreateCheckoutOrderResult {
  orderId: string
  orderNumber: string
  razorpayOrderId: string
  razorpayKeyId: string
  amountPaisa: number
  currency: string
  expiresAt: string
}

export interface VerifyPaymentResult {
  orderId: string
  orderNumber: string
  status: string
  paymentStatus: string
  alreadyCaptured: boolean
}

export interface CheckoutPaymentSession {
  checkoutRequestId: string | null
  orderId: string
  orderNumber: string
  razorpayOrderId: string | null
  razorpayKeyId: string
  amountPaisa: number
  currency: 'INR'
  expiresAt: string | null
  retentionDeadlineAt: string | null
  serverTime: string
  state: 'preparing' | 'payable' | 'pending' | 'paid' | 'released' | 'review'
  canPay: boolean
  snapshot: {
    items: Array<{
      productId: string
      productName: string
      productImage: string | null
      quantity: number
      unitPricePaisa: number
      totalPricePaisa: number
    }>
    subtotalPaisa: number
    discountAmountPaisa: number
    shippingAmountPaisa: number
    taxAmountPaisa: number
    couponCode: string | null
    shippingMethod: string
    contactEmail: string
    shipping: {
      fullName: string
      phone: string
      line1: string
      line2: string | null
      city: string
      state: string
      pincode: string
    }
  }
}
