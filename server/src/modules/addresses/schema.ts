import { z } from 'zod';

export const AddressIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateAddressSchema = z
  .object({
    full_name: z.string().min(1).max(200),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
    address_line1: z.string().min(1).max(500),
    address_line2: z.string().max(500).optional(),
    city: z.string().min(1).max(200),
    state: z.string().min(1).max(100),
    pincode: z
      .string()
      .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
    country: z.string().min(1).max(100).default('India'),
    is_default: z.boolean().default(false),
  })
  .strict();

export const UpdateAddressSchema = CreateAddressSchema.partial().strict();

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;
