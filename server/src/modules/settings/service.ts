import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { UpdateSettingsInput } from './schema'

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
  shipping_rules: {
    shipping_charge_paisa: number
    free_shipping_threshold_paisa: number
  }
}

const SETTING_KEYS = [
  'contact_info',
  'announcement_bar',
  'hero_slides',
  'promo_banners',
  'store_description',
  'shipping_rules',
] as const

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await adminSupabase
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch site settings')

  const map: Record<string, unknown> = {}
  for (const row of data ?? []) {
    map[row.key] = row.value
  }

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
    store_description:
      (map['store_description'] as string) ??
      'Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home.',
    shipping_rules: (map['shipping_rules'] as SiteSettings['shipping_rules']) ?? {
      shipping_charge_paisa: 15000,
      free_shipping_threshold_paisa: 100000,
    },
  }
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SiteSettings> {
  const updates = Object.entries(input).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  for (const update of updates) {
    const { error } = await adminSupabase
      .from('site_settings')
      .upsert(update, { onConflict: 'key' })

    if (error) throw new AppError(500, 'DB_ERROR', `Failed to update setting: ${update.key}`)
  }

  return getSettings()
}
