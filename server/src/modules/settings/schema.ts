import { z } from 'zod'

export const HeroSlideSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  imageUrl: z.string().url(),
  link: z.string().min(1),
})

export const PromoBannerSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  imageUrl: z.string().url(),
  link: z.string().min(1),
})

export const AnnouncementBarSchema = z.object({
  enabled: z.boolean(),
  badge: z.string().max(100).optional().default(''),
  message: z.string().max(500),
})

export const ContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(1).max(50),
  address: z.string().min(1).max(500),
})

export const ShippingRulesSchema = z
  .object({
    shipping_charge_paisa: z.literal(0),
    free_shipping_threshold_paisa: z.literal(0),
  })
  .strict()

export const ShippingMethodSchema = z
  .object({
    enabled: z.boolean(),
    label: z.string().trim().min(1).max(100),
    description: z.string().max(200),
    charge_paisa: z.literal(0),
    free_threshold_paisa: z.literal(0),
  })
  .strict()

export const ShippingMethodsSchema = z
  .object({
    standard: ShippingMethodSchema,
    express: ShippingMethodSchema,
  })
  .strict()

export const ShiprocketSettingsSchema = z
  .object({
    pickup_location: z.string().trim().min(1).max(200),
    default_length_cm: z.number().int().positive(),
    default_breadth_cm: z.number().int().positive(),
    default_height_cm: z.number().int().positive(),
    default_weight_grams: z.number().int().positive(),
  })
  .strict()

export const UpdateSettingsSchema = z
  .object({
    contact_info: ContactInfoSchema.optional(),
    announcement_bar: AnnouncementBarSchema.optional(),
    hero_slides: z.array(HeroSlideSchema).min(1).max(10).optional(),
    promo_banners: z.array(PromoBannerSchema).max(2).optional(),
    store_description: z.string().max(1000).optional(),
    shipping_rules: ShippingRulesSchema.optional(),
    shipping_methods: ShippingMethodsSchema.optional(),
    shiprocket_settings: ShiprocketSettingsSchema.partial().optional(),
  })
  .strict()

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>
export type HeroSlide = z.infer<typeof HeroSlideSchema>
export type PromoBanner = z.infer<typeof PromoBannerSchema>
export type AnnouncementBar = z.infer<typeof AnnouncementBarSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type ShippingRulesInput = z.infer<typeof ShippingRulesSchema>
