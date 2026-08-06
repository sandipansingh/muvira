import type { ValidationResult } from './checkout.validator'

export interface CouponInput {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmountRupees?: number
}

/**
 * Validates coupon creation input.
 * Consolidated from admin CouponsList.tsx logic.
 */
export function validateCouponInput(input: CouponInput): ValidationResult {
  const errors: Record<string, string> = {}

  const formattedCode = input.code ? input.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
  if (!formattedCode) {
    errors.code = 'Coupon code is required (alphanumeric only)'
  }

  if (input.discountValue <= 0) {
    errors.discountValue = 'Discount value must be greater than zero'
  }

  if (input.discountType === 'percentage' && input.discountValue > 100) {
    errors.discountValue = 'Percentage discount cannot exceed 100%'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Formats a coupon code to standard uppercase alphanumeric format.
 */
export function formatCouponCode(rawCode: string): string {
  return rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
