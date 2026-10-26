import { z } from 'zod'

export const ServiceabilitySchema = z
  .object({
    pickup_pincode: z.string().regex(/^\d{6}$/),
    delivery_pincode: z.string().regex(/^\d{6}$/),
    weight_grams: z.number().int().positive().optional(),
    weight: z.number().int().positive().optional(),
    cod: z.boolean(),
  })
  .strict()
  .refine(
    (value) => (value.weight_grams === undefined) !== (value.weight === undefined),
    'Provide package weight in grams'
  )
  .transform((value) => ({
    pickup_pincode: value.pickup_pincode,
    delivery_pincode: value.delivery_pincode,
    weight_grams: value.weight_grams ?? value.weight!,
    cod: value.cod,
  }))

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
