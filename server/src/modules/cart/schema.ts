import { z } from 'zod'

export const CartItemIdParamsSchema = z.object({
  itemId: z.string().uuid(),
})

export const AddToCartSchema = z
  .object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })
  .strict()

export const UpdateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(100),
  })
  .strict()

export type AddToCartInput = z.infer<typeof AddToCartSchema>
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>
