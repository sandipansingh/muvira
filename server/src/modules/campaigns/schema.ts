import { z } from 'zod';

export const CampaignIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateCampaignSchema = z
  .object({
    name: z.string().min(1).max(300),
    description: z.string().max(2000).optional(),
    banner_image_url: z.string().url().optional(),
    discount_percentage: z.number().int().min(0).max(100).optional(),
    is_active: z.boolean().default(false),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
  })
  .strict()
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: 'ends_at must be after starts_at',
    path: ['ends_at'],
  });

export const UpdateCampaignSchema = z
  .object({
    name: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).optional(),
    banner_image_url: z.string().url().optional(),
    discount_percentage: z.number().int().min(0).max(100).optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
  })
  .strict();

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
