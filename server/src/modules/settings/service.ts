import { adminSupabase } from '../../lib/supabase/admin'
import { databaseError } from '../../lib/databaseError'
import type { UpdateSettingsInput } from './schema'
import { ShippingMethodsSchema, ShiprocketSettingsSchema } from './schema'
import { getPickupLocations } from '../../services/shiprocket'
import { AppError } from '../../types'
import type { z } from 'zod'
import { hasSchemaCapability } from '../../services/runtimeSchema'

export interface SiteSettings {
  contact_info: {
    email: string
    phone: string
    address: string
  }
  announcement_bar: {
    enabled: boolean
    badge: string
    message: string
  }
  hero_slides: Array<{
    id: string
    title: string
    subtitle: string
    imageUrl: string
    link: string
  }>
  promo_banners: Array<{
    id: string
    title: string
    subtitle: string
    imageUrl: string
    link: string
  }>
  store_description: string
  shipping_methods: z.infer<typeof ShippingMethodsSchema> | null
  configuration: { shipping_ready: boolean; fulfillment_ready: boolean; errors: string[] }
  shipping_rules: {
    shipping_charge_paisa: number
    free_shipping_threshold_paisa: number
  } | null
  shiprocket_settings: {
    pickup_location: string
    default_length_cm: number
    default_breadth_cm: number
    default_height_cm: number
    default_weight_grams: number
  }
}

const SETTING_KEYS = [
  'contact_info',
  'announcement_bar',
  'hero_slides',
  'promo_banners',
  'store_description',
  'shipping_methods',
  'shipping_rules',
  'shiprocket_settings',
] as const

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await adminSupabase
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS)

  if (error) throw databaseError('settings.get', error, 'Failed to fetch site settings')

  const map: Record<string, unknown> = {}
  for (const row of data ?? []) {
    map[row.key] = row.value
  }

  const shipping = ShippingMethodsSchema.safeParse(map['shipping_methods'])
  const fulfillment = ShiprocketSettingsSchema.safeParse(map['shiprocket_settings'])
  const shippingReady =
    shipping.success && shipping.data.standard.enabled && shipping.data.express.enabled
  const errors: string[] = []
  if (!shippingReady) errors.push('Configure free standard and express shipping in store settings.')
  if (!fulfillment.success)
    errors.push(
      'Select a registered Shiprocket pickup location and save package defaults in store settings.'
    )
  return {
    contact_info: (map['contact_info'] as SiteSettings['contact_info']) ?? {
      email: '',
      phone: '',
      address: '',
    },
    announcement_bar: (map['announcement_bar'] as SiteSettings['announcement_bar']) ?? {
      enabled: false,
      badge: '',
      message: '',
    },
    hero_slides: (map['hero_slides'] as SiteSettings['hero_slides']) ?? [],
    promo_banners: (map['promo_banners'] as SiteSettings['promo_banners']) ?? [],
    store_description: (map['store_description'] as string) ?? '',
    shipping_methods: shipping.success ? shipping.data : null,
    configuration: {
      shipping_ready: shippingReady,
      fulfillment_ready: fulfillment.success,
      errors,
    },
    shipping_rules: shipping.success
      ? {
          shipping_charge_paisa: shipping.data.standard.charge_paisa,
          free_shipping_threshold_paisa: shipping.data.standard.free_threshold_paisa,
        }
      : null,
    shiprocket_settings: (map['shiprocket_settings'] as SiteSettings['shiprocket_settings']) ?? {
      pickup_location: '',
      default_length_cm: 15,
      default_breadth_cm: 10,
      default_height_cm: 5,
      default_weight_grams: 500,
    },
  }
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SiteSettings> {
  if (!(await hasSchemaCapability(49))) {
    throw new AppError(
      503,
      'SCHEMA_UPGRADE_REQUIRED',
      'Store settings changes require database migration 049. Please complete the database upgrade.'
    )
  }
  if (input.shiprocket_settings) {
    const current = await getSettings()
    const merged = ShiprocketSettingsSchema.safeParse({
      ...current.shiprocket_settings,
      ...input.shiprocket_settings,
    })
    if (!merged.success)
      throw new AppError(
        400,
        'FULFILLMENT_CONFIG_INVALID',
        'Select a registered pickup location and provide positive package dimensions and weight.'
      )
    const locations = await getPickupLocations()
    if (!locations.some((location) => location.pickup_location === merged.data.pickup_location)) {
      throw new AppError(
        400,
        'INVALID_PICKUP_LOCATION',
        'Select a registered Shiprocket pickup location.'
      )
    }
  }
  const { error } = await adminSupabase.rpc('update_site_settings_bulk', { p_settings: input })
  if (error) throw databaseError('settings.update', error, 'Failed to update site settings')

  return getSettings()
}
