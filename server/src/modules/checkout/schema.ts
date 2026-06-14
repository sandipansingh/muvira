import { z } from 'zod'

export const CreateOrderSchema = z
  .object({
    address_id: z.string().uuid(),
    coupon_code: z.string().min(1).max(50).optional(),
    notes: z.string().max(2000).optional(),
    // SECURITY NOTE: client must NOT send amount, price, total, or discount.
    // Any of those fields will be rejected by .strict() below.
  })
  .strict() // .strict() rejects unknown fields — prevents amount/price smuggling

export const RemoveCouponSchema = z.object({}).strict()

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
