import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
      .optional(),
  })
  .strict(); // rejects unknown fields — prevents role smuggling

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
