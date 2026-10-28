import type { ShiprocketServiceabilityResponse } from '../services/shiprocket'

export type ShippingCourier = ShiprocketServiceabilityResponse['data']['available_courier'][number]
export type ShippingMethod = 'standard' | 'express'

export interface ShippingPackage {
  weight_grams: number
  length_cm: number
  breadth_cm: number
  height_cm: number
  declared_value_paisa: number
}

export interface ShippingAvailability {
  available: boolean
  estimated_delivery_days: number | null
  recommended_courier: ShippingCourier | null
  couriers: ShippingCourier[]
  pickup_pincode: string
}

export interface CheckoutShippingContext {
  cart: Array<{
    product_id: string
    quantity: number
    weight_grams: number | null
    price_paisa: number
  }>
  address: { id: string; pincode: string; country: string }
  shipping_method: ShippingMethod
  shipping_methods: Record<ShippingMethod, { enabled: boolean }>
  shiprocket_settings: {
    pickup_location: string
    default_weight_grams: number
    default_length_cm: number
    default_breadth_cm: number
    default_height_cm: number
  }
  declared_value_paisa: number
}

export interface VerifiedCheckoutShipping {
  context: CheckoutShippingContext
  fingerprint: string
  availability: ShippingAvailability
  package: ShippingPackage
}
