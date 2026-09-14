/**
 * Coupon domain entity and Checkout Coupon preview models.
 */
export interface CouponPreview {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmount: number
  newSubtotal: number
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  usageLimit: number | null
  timesUsed: number
  validFrom: string
  validUntil: string | null
  isActive: boolean
}
