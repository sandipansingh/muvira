import { z } from 'zod'

export const InventoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  low_stock_only: z.enum(['true', 'false']).default('false'),
  category: z.string().min(1).max(300).optional(),
})

export const UpdateStockSchema = z
  .object({
    stock: z.number().int().min(0),
  })
  .strict()

export type InventoryQuery = z.infer<typeof InventoryQuerySchema>
export type UpdateStockInput = z.infer<typeof UpdateStockSchema>
