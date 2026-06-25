import { z } from 'zod'

export const HeroSlideSchema = z.object({
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

export const ShippingRulesSchema = z.object({
  shipping_charge_paisa: z.number().int().min(0),
  free_shipping_threshold_paisa: z.number().int().min(0),
})

export const UpdateSettingsSchema = z
  .object({
    contact_info: ContactInfoSchema.optional(),
    announcement_bar: AnnouncementBarSchema.optional(),
    hero_slides: z.array(HeroSlideSchema).min(1).max(10).optional(),
    store_description: z.string().max(1000).optional(),
    shipping_rules: ShippingRulesSchema.optional(),
  })
  .strict()

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>
export type HeroSlide = z.infer<typeof HeroSlideSchema>
export type AnnouncementBar = z.infer<typeof AnnouncementBarSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type ShippingRulesInput = z.infer<typeof ShippingRulesSchema>
