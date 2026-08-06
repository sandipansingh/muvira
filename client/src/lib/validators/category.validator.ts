import type { ValidationResult } from './checkout.validator'

export interface CategoryFormInput {
  name: string
  showInNavbar?: boolean
  currentNavbarCount?: number
  isEditingCurrentNavbarCategory?: boolean
}

/**
 * Validates category creation/update input.
 * Consolidated from admin CategoriesList.tsx validation rules.
 */
export function validateCategoryInput(input: CategoryFormInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name || !input.name.trim()) {
    errors.name = 'Category name is required'
  }

  // Enforces max 5 categories shown in navbar simultaneously rule
  if (
    input.showInNavbar &&
    !input.isEditingCurrentNavbarCategory &&
    (input.currentNavbarCount ?? 0) >= 5
  ) {
    errors.showInNavbar = 'Maximum 5 categories can be shown in the navigation bar'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
