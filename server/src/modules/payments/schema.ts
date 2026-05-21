import { z } from 'zod';

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
  .strict();

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
