import { z } from 'zod'

export const OrderIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const ListOrdersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  status: z
    .enum([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'rto',
      'returned',
      'refunded',
      'lost',
      'damaged',
      'delivery_failed',
    ])
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
})

// Admin-only schemas
export const UpdateOrderStatusSchema = z
  .object({
    status: z.enum([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'rto',
      'returned',
      'refunded',
      'lost',
      'damaged',
      'delivery_failed',
    ]),
  })
  .strict()

export const UpdateFulfillmentSchema = z
  .object({
    awb_code: z.string().max(100).optional().nullable(),
  })
  .strict()

export const AddOrderNoteSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict()

export const AdminListOrdersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  status: z
    .enum([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'rto',
      'returned',
      'refunded',
      'lost',
      'damaged',
      'delivery_failed',
    ])
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled', 'exception']).optional(),
  q: z.string().max(100).optional(), // search by order_number or user email
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
})

// Shiprocket admin action schemas

export const AssignAwbSchema = z
  .object({
    courier_id: z.number().int().optional(),
  })
  .strict()

export const PackageDimensionsSchema = z
  .object({
    length_cm: z.number().int().min(1).optional(),
    breadth_cm: z.number().int().min(1).optional(),
    height_cm: z.number().int().min(1).optional(),
    weight_grams: z.number().int().min(1).optional(),
  })
  .strict()

export const ShiprocketCancelSchema = z.object({}).strict()

export const CreateShipmentSchema = z
  .object({
    pickup_location: z.string().min(1),
  })
  .strict()

export const FulfillOrderSchema = z
  .object({
    pickup_location: z.string().min(1, 'Pickup location is required'),
    weight_grams: z.number().int().min(1, 'Weight must be at least 1g'),
    length_cm: z.number().int().min(1, 'Length must be at least 1cm'),
    breadth_cm: z.number().int().min(1, 'Breadth must be at least 1cm'),
    height_cm: z.number().int().min(1, 'Height must be at least 1cm'),
    courier_id: z.number().int().optional(),
  })
  .strict()

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>
export type AdminListOrdersQuery = z.infer<typeof AdminListOrdersQuerySchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type UpdateFulfillmentInput = z.infer<typeof UpdateFulfillmentSchema>
export type AddOrderNoteInput = z.infer<typeof AddOrderNoteSchema>
export type AssignAwbInput = z.infer<typeof AssignAwbSchema>
export type PackageDimensionsInput = z.infer<typeof PackageDimensionsSchema>
export type FulfillOrderInput = z.infer<typeof FulfillOrderSchema>
