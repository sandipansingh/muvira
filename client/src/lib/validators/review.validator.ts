import type { ValidationResult } from './checkout.validator'

export interface ReviewInput {
  rating: number
  comment?: string | null
}

/**
 * Validates product review submission input.
 * Consolidated from ProductDetail.tsx review form logic.
 */
export function validateReviewInput(input: ReviewInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = 'Rating must be an integer between 1 and 5'
  }

  if (input.comment && input.comment.length > 2000) {
    errors.comment = 'Comment must be 2000 characters or fewer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
