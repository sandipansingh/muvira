import { z } from 'zod';

export const OrderIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ListOrdersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
});

// Admin-only schemas
export const UpdateOrderStatusSchema = z
  .object({
    status: z.enum([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ]),
  })
  .strict();

export const UpdateFulfillmentSchema = z
  .object({
    fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled', 'exception']).optional(),
    carrier_name: z.string().max(200).optional(),
    tracking_id: z.string().max(200).optional(),
  })
  .strict();

export const AddOrderNoteSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

export const AdminListOrdersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  fulfillment_status: z
    .enum(['unfulfilled', 'partial', 'fulfilled', 'exception'])
    .optional(),
  q: z.string().max(100).optional(), // search by order_number or user email
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
});

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
export type AdminListOrdersQuery = z.infer<typeof AdminListOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type UpdateFulfillmentInput = z.infer<typeof UpdateFulfillmentSchema>;
export type AddOrderNoteInput = z.infer<typeof AddOrderNoteSchema>;
