import { z } from 'zod'

export const CreateOrderSchema = z
  .object({
    address_id: z.string().uuid(),
    coupon_code: z.string().min(1).max(50).optional(),
    notes: z.string().max(2000).optional(),
    // SECURITY NOTE: client must NOT send amount, price, total, or discount.
    // Any of those fields will be rejected by .strict() below.
  })
  .strict() // .strict() rejects unknown fields - prevents amount/price smuggling

export const RemoveCouponSchema = z.object({}).strict()

export const PayCustomSchema = z
  .object({
    address_id: z.string().uuid(),
    coupon_code: z.string().min(1).max(50).optional(),
    notes: z.string().max(2000).optional(),
    method: z.enum(['card', 'upi', 'netbanking', 'wallet']),
    card: z
      .object({
        number: z.string().min(12).max(19),
        expiryMonth: z.string().length(2),
        expiryYear: z.string().min(2).max(4),
        cvv: z.string().min(3).max(4),
        name: z.string().min(1).max(100),
      })
      .optional(),
    upi: z
      .object({
        vpa: z.string().min(3).max(100),
      })
      .optional(),
    netbanking: z
      .object({
        bankCode: z.string().min(2).max(20),
      })
      .optional(),
    wallet: z
      .object({
        walletName: z.string().min(2).max(50),
      })
      .optional(),
  })
  .strict()

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type PayCustomInput = z.infer<typeof PayCustomSchema>
