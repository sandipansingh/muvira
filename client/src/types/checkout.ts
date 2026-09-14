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
