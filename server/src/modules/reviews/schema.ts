import { z } from "zod";

// Public / user query for reviews list
export const ProductReviewsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
});

export const ProductIdParamsSchema = z.object({
  productId: z.string().uuid(),
});

export const ReviewIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// Create / update review (upsert semantics in service)
export const CreateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional().nullable(),
  })
  .strict();

// Admin list query
export const AdminReviewsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  productId: z.string().uuid().optional(),
  rating: z
    .string()
    .regex(/^[1-5]$/)
    .transform(Number)
    .optional(),
  q: z.string().max(200).optional(), // search in comment or product name
});

export type ProductReviewsQuery = z.infer<typeof ProductReviewsQuerySchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type AdminReviewsQuery = z.infer<typeof AdminReviewsQuerySchema>;
