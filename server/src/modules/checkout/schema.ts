import { z } from 'zod'

export const ShippingMethodSchema = z.enum(['standard', 'express'])

export const CheckoutQuoteSchema = z
  .object({
    coupon_code: z.string().trim().min(1).max(50).toUpperCase().optional(),
    shipping_method: ShippingMethodSchema.default('standard'),
  })
  .strict()

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>
export type CheckoutQuoteInput = z.infer<typeof CheckoutQuoteSchema>
