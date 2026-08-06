import type { ValidationResult } from './checkout.validator'

export interface ProductFormInput {
  name: string
  categoryId: string
  priceRupees: number
  salePriceRupees?: number | null
  stock: number
  imagesCount: number
}

/**
 * Validates product creation/update input.
 * Consolidated from admin ProductForm.tsx logic.
 */
export function validateProductInput(input: ProductFormInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name || !input.name.trim()) {
    errors.name = 'Product name is required'
  }

  if (!input.categoryId) {
    errors.categoryId = 'Category selection is required'
  }

  if (input.priceRupees <= 0) {
    errors.priceRupees = 'Price must be greater than zero'
  }

  if (
    input.salePriceRupees !== undefined &&
    input.salePriceRupees !== null &&
    input.salePriceRupees >= input.priceRupees
  ) {
    errors.salePriceRupees = 'Sale price must be lower than original price'
  }

  if (input.stock < 0) {
    errors.stock = 'Stock count cannot be negative'
  }

  if (input.imagesCount <= 0) {
    errors.images = 'At least 1 product image is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
