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
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number
  usageLimit: number
  validFrom: string
  validUntil: string
  isActive: boolean
}
