import { z } from 'zod'

export const ServiceabilitySchema = z
  .object({
    pickup_pincode: z.string().min(1).max(10),
    delivery_pincode: z.string().min(1).max(10),
    weight: z.number().int().min(1),
    cod: z.boolean(),
  })
  .strict()

export const ShiprocketSettingsUpdateSchema = z
  .object({
    pickup_location: z.string().min(1).optional(),
    default_length_cm: z.number().int().min(1).optional(),
    default_breadth_cm: z.number().int().min(1).optional(),
    default_height_cm: z.number().int().min(1).optional(),
    default_weight_grams: z.number().int().min(1).optional(),
  })
  .strict()

export type ServiceabilityInput = z.infer<typeof ServiceabilitySchema>
export type ShiprocketSettingsUpdateInput = z.infer<typeof ShiprocketSettingsUpdateSchema>
