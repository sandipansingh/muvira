import { z } from 'zod'

export const ShippingMethodSchema = z.enum(['standard', 'express'])

export const CheckoutQuoteSchema = z
  .object({
    address_id: z.string().uuid().optional(),
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
  checkout_request_id: z.string().uuid(),
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
export const CheckoutSessionParamsSchema = z.object({ orderId: z.string().uuid() }).strict()
export const CheckoutRequestParamsSchema = z.object({ requestId: z.string().uuid() }).strict()
export const CheckoutAttemptSchema = z.object({ checkout_request_id: z.string().uuid() }).strict()

const SafeProviderCode = z.string().regex(/^[A-Za-z][A-Za-z0-9_:-]{0,79}$/)
export const PaymentDiagnosticSchema = z
  .object({
    method: z.enum(['upi', 'card', 'netbanking', 'wallet']),
    flow: z.enum(['intent', 'redirect_qr', 'embedded_qr', 'redirect', 'card']),
    code: SafeProviderCode.optional(),
    source: SafeProviderCode.optional(),
    step: SafeProviderCode.optional(),
    reason: SafeProviderCode.optional(),
    orderId: z
      .string()
      .regex(/^order_[A-Za-z0-9]{1,90}$/)
      .optional(),
    paymentId: z
      .string()
      .regex(/^pay_[A-Za-z0-9]{1,90}$/)
      .optional(),
  })
  .strict()

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>
export type CheckoutQuoteInput = z.infer<typeof CheckoutQuoteSchema>
export type CreateCheckoutOrderInput = z.infer<typeof CreateCheckoutOrderSchema>
