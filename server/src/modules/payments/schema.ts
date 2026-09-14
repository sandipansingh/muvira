import { z } from 'zod'

// Schema for the payment verification endpoint.
// These are the three values Razorpay Checkout returns to the client
// after a payment attempt.
export const VerifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    // SECURITY: client must NOT send amount, status, or any field
    // that could influence what gets marked as paid.
    // .strict() rejects any extra fields.
  })
  .strict()

export const RazorpayWebhookPaymentSchema = z
  .object({
    id: z.string().min(1),
    order_id: z.string().min(1),
    amount: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
    currency: z.string().length(3),
    status: z.string().min(1),
    captured: z.boolean(),
    method: z.string().min(1),
    error_description: z.string().nullable().optional(),
  })
  .passthrough()

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>
export type RazorpayWebhookPayment = z.infer<typeof RazorpayWebhookPaymentSchema>
