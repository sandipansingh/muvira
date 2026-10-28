import { AppError } from '../types'
import { checkServiceability, getPickupLocations } from './shiprocket'
import type {
  CheckoutShippingContext,
  ShippingAvailability,
  ShippingCourier,
  ShippingMethod,
  ShippingPackage,
} from '../types/shipping'

export function rankServiceableCouriers(
  couriers: ShippingCourier[],
  method: ShippingMethod
): ShippingCourier[] {
  const estimate = (courier: ShippingCourier) =>
    courier.estimated_delivery_days ?? Number.POSITIVE_INFINITY
  return couriers
    .filter(
      (courier) =>
        Number.isSafeInteger(courier.courier_id) &&
        courier.courier_id > 0 &&
        Number.isSafeInteger(courier.rate_paisa) &&
        courier.rate_paisa >= 0 &&
        (method === 'standard' ||
          (courier.estimated_delivery_days !== null &&
            Number.isFinite(courier.estimated_delivery_days) &&
            courier.estimated_delivery_days > 0))
    )
    .sort((a, b) => {
      const costDifference = a.rate_paisa - b.rate_paisa
      const estimateDifference = estimate(a) - estimate(b)
      return (
        (method === 'standard'
          ? costDifference || estimateDifference
          : estimateDifference || costDifference) || a.courier_id - b.courier_id
      )
    })
}

export function packageFromCheckoutContext(context: CheckoutShippingContext): ShippingPackage {
  const settings = context.shiprocket_settings
  const result = {
    weight_grams: context.cart.reduce(
      (total, line) => total + (line.weight_grams ?? settings.default_weight_grams) * line.quantity,
      0
    ),
    length_cm: settings.default_length_cm,
    breadth_cm: settings.default_breadth_cm,
    height_cm: settings.default_height_cm,
    declared_value_paisa: context.declared_value_paisa,
  }
  if (
    !settings.pickup_location?.trim() ||
    Object.values(result).some((value) => !Number.isSafeInteger(value) || value <= 0)
  )
    throw new AppError(503, 'SHIPPING_CONFIG_INVALID', 'Delivery configuration needs attention.')
  return result
}

export async function checkShippingServiceability(
  input: ShippingPackage & {
    pickup_location: string
    delivery_pincode: string
    shipping_method: ShippingMethod
  }
): Promise<ShippingAvailability> {
  try {
    const locations = await getPickupLocations()
    const matches = locations.filter(
      (location) => location.pickup_location === input.pickup_location
    )
    if (matches.length !== 1)
      throw new Error('The registered pickup location could not be resolved uniquely')
    const pickup = matches[0]!
    const { available_courier: couriers } = await checkServiceability({
      pickup_pincode: pickup.pincode,
      delivery_pincode: input.delivery_pincode,
      cod: false,
      weight_grams: input.weight_grams,
      length_cm: input.length_cm,
      breadth_cm: input.breadth_cm,
      height_cm: input.height_cm,
      declared_value_paisa: input.declared_value_paisa,
    })
    const recommended = rankServiceableCouriers(couriers, input.shipping_method)[0] ?? null
    return {
      available: recommended !== null,
      estimated_delivery_days: recommended?.estimated_delivery_days ?? null,
      recommended_courier: recommended,
      couriers,
      pickup_pincode: pickup.pincode,
    }
  } catch {
    throw new AppError(
      503,
      'SHIPPING_SERVICEABILITY_UNAVAILABLE',
      'Delivery availability could not be checked. Please try again shortly.'
    )
  }
}
