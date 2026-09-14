import { z } from 'zod'

export const ShippingMethodSchema = z.enum(['standard', 'express'])

export const CheckoutQuoteSchema = z
  .object({
    coupon_code: z.string().trim().min(1).max(50).toUpperCase().optional(),
    shipping_method: ShippingMethodSchema.default('standard'),
  })
  .strict()

const BillingAddressSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200),
    address_line1: z.string().trim().min(1).max(500),
    address_line2: z.string().trim().max(500).optional(),
    city: z.string().trim().min(1).max(200),
    state: z.string().trim().min(1).max(100),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
    country: z.string().trim().min(1).max(100).default('India'),
    gst_number: z
      .string()
      .trim()
      .regex(/^[0-9A-Z]{15}$/, 'GST number must be 15 alphanumeric characters')
      .optional(),
  })
  .strict()

export const CreateCheckoutOrderSchema = CheckoutQuoteSchema.extend({
  address_id: z.string().uuid(),
  billing_same_as_shipping: z.boolean().default(true),
  billing: BillingAddressSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
})
  .strict()
  .superRefine((input, context) => {
    if (!input.billing_same_as_shipping && !input.billing) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billing'],
        message: 'Billing address is required when it differs from shipping',
      })
    }
  })

export const CancelCheckoutSchema = z.object({ order_id: z.string().uuid() }).strict()

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>
export type CheckoutQuoteInput = z.infer<typeof CheckoutQuoteSchema>
export type CreateCheckoutOrderInput = z.infer<typeof CreateCheckoutOrderSchema>
