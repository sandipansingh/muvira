export type ShippingMethod = 'standard' | 'express'

export interface ShippingOption {
  enabled: boolean
  label: string
  description: string
  amountPaisa: number
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
