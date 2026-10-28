import { z } from 'zod'
import { adminSupabase } from '../../lib/supabase/admin'
import { databaseError } from '../../lib/databaseError'
import { AppError } from '../../types'
import type { CheckoutShippingContext, VerifiedCheckoutShipping } from '../../types/shipping'
import {
  checkShippingServiceability,
  packageFromCheckoutContext,
} from '../../services/shippingServiceability'
import type { CreateCheckoutOrderInput } from './schema'

const contextResponseSchema = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  context: z
    .object({
      cart: z
        .array(
          z
            .object({
              product_id: z.string().uuid(),
              quantity: z.number().int().positive(),
              weight_grams: z.number().int().positive().nullable(),
              price_paisa: z.number().int().nonnegative(),
            })
            .passthrough()
        )
        .min(1),
      address: z
        .object({
          id: z.string().uuid(),
          pincode: z.string().regex(/^\d{6}$/),
          country: z.string(),
        })
        .passthrough(),
      shipping_method: z.enum(['standard', 'express']),
      shipping_methods: z
        .object({
          standard: z.object({ enabled: z.boolean() }).passthrough(),
          express: z.object({ enabled: z.boolean() }).passthrough(),
        })
        .passthrough(),
      shiprocket_settings: z
        .object({
          pickup_location: z.string().trim().min(1),
          default_weight_grams: z.number().int().positive(),
          default_length_cm: z.number().int().positive(),
          default_breadth_cm: z.number().int().positive(),
          default_height_cm: z.number().int().positive(),
        })
        .passthrough(),
      declared_value_paisa: z.number().int().min(100),
    })
    .passthrough(),
})

export async function verifyCheckoutShipping(
  userId: string,
  input: Pick<CreateCheckoutOrderInput, 'address_id' | 'shipping_method' | 'coupon_code'>,
  requireAvailability = true
): Promise<VerifiedCheckoutShipping & { checked_at: string }> {
  const { data, error } = await adminSupabase.rpc('get_checkout_shipping_context', {
    p_user_id: userId,
    p_address_id: input.address_id,
    p_shipping_method: input.shipping_method,
    p_coupon_code: input.coupon_code ?? null,
  })
  if (error)
    throw databaseError(
      'checkout.shipping_context',
      error,
      'Delivery details could not be checked.',
      {
        statusCode: error.code === 'P0002' ? 404 : 400,
        code: error.code === 'P0002' ? 'ADDRESS_OR_CART_NOT_FOUND' : 'SHIPPING_CONTEXT_INVALID',
      }
    )
  const parsed = contextResponseSchema.safeParse(data)
  if (!parsed.success)
    throw new AppError(503, 'SHIPPING_CONFIG_INVALID', 'Delivery configuration needs attention.')
  const context: CheckoutShippingContext = parsed.data.context
  const shipmentPackage = packageFromCheckoutContext(context)
  const availability = await checkShippingServiceability({
    ...shipmentPackage,
    pickup_location: context.shiprocket_settings.pickup_location,
    delivery_pincode: context.address.pincode,
    shipping_method: input.shipping_method,
  })
  if (
    requireAvailability &&
    (!availability.available || !context.shipping_methods[input.shipping_method].enabled)
  )
    throw new AppError(
      400,
      'SHIPPING_METHOD_UNAVAILABLE',
      'This delivery method is unavailable for your address. Choose another method or address.'
    )
  return {
    context: parsed.data.context,
    fingerprint: parsed.data.fingerprint,
    package: shipmentPackage,
    availability,
    checked_at: new Date().toISOString(),
  }
}
