import { z } from 'zod';

export const CategoryParamsSchema = z.object({
  slug: z.string().min(1).max(300),
});

export const CategoryIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateCategorySchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(2000).optional(),
    image_url: z.string().url().optional(),
    parent_id: z.string().uuid().optional(),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).default(0),
    show_in_navbar: z.boolean().default(false),
  })
  .strict();

export const UpdateCategorySchema = CreateCategorySchema.partial().strict();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
