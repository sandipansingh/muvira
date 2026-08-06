export interface AddressInput {
  fullName: string
  phone: string
  line1: string
  city: string
  state: string
  pincode: string
  label?: string
  line2?: string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validates checkout address input fields.
 * Consolidated from CheckoutPage.tsx address form validation logic.
 */
export function validateCheckoutAddress(input: AddressInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.fullName || !input.fullName.trim()) {
    errors.fullName = 'Full name is required'
  }

  const cleanPhone = input.phone ? input.phone.replace(/\D/g, '') : ''
  if (!cleanPhone || cleanPhone.length !== 10) {
    errors.phone = 'Valid 10-digit phone number is required'
  }

  if (!input.line1 || !input.line1.trim()) {
    errors.line1 = 'Street address line 1 is required'
  }

  if (!input.city || !input.city.trim()) {
    errors.city = 'City is required'
  }

  if (!input.state || !input.state.trim()) {
    errors.state = 'State is required'
  }

  const cleanPincode = input.pincode ? input.pincode.replace(/\D/g, '') : ''
  if (!cleanPincode || cleanPincode.length !== 6) {
    errors.pincode = 'Valid 6-digit postal pincode is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
