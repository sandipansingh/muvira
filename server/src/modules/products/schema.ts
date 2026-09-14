import { z } from 'zod'

// Public query schema

export const ListProductsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  category: z.string().min(1).max(300).optional(),
  min_price_paisa: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_price_paisa: z.string().regex(/^\d+$/).transform(Number).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'popularity']).default('newest'),
  q: z.string().max(200).optional(),
})

export const ProductParamsSchema = z.object({
  slug: z.string().min(1).max(300),
})

export const ProductIdParamsSchema = z.object({
  id: z.string().uuid(),
})

// Admin schemas (strict - rejects unknown fields)

export const CreateProductSchema = z
  .object({
    name: z.string().min(1).max(500),
    slug: z
      .string()
      .min(1)
      .max(300)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(10000).optional(),
    short_description: z.string().max(500).optional(),
    category_id: z.string().uuid(),
    price_paisa: z.number().int().min(0),
    compare_at_price_paisa: z.number().int().min(0).optional(),
    cost_price_paisa: z.number().int().min(0).optional(),
    sku: z.string().max(100).optional(),
    stock: z.number().int().min(0).default(0),
    weight_grams: z.number().int().min(0).optional(),
    is_active: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    tags: z.array(z.string().max(100)).max(20).optional(),
    meta_title: z.string().max(200).optional(),
    meta_description: z.string().max(500).optional(),
    metadata: z.record(z.string()).optional(),
  })
  .strict()

export const UpdateProductSchema = CreateProductSchema.partial().strict()

export const AddProductImageSchema = z
  .object({
    url: z.string().url(),
    alt_text: z.string().max(300).optional(),
    sort_order: z.number().int().min(0).default(0),
    is_primary: z.boolean().default(false),
  })
  .strict()

export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type AddProductImageInput = z.infer<typeof AddProductImageSchema>
