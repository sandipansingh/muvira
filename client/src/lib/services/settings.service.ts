import { api } from '../api/client'
import { mapSiteSettings } from '../utils/adapters'
import type { SiteSettings } from '../types/settings'
import type { ApiResponse } from '../types/common'

type RawSettingsResponse = {
  success: boolean
  data?: Record<string, unknown>
  error?: { code: string; message: string }
}

/**
 * Site configuration API service functions.
 */
export const settingsService = {
  /**
   * Fetches global site configuration (hero slides, shipping rules, announcements, contact info).
   */
  async getSettings(): Promise<ApiResponse<SiteSettings>> {
    const res = await api.get<RawSettingsResponse>('/api/settings')
    if (!res.success || !res.data) {
      return { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to load settings' } }
    }
    return { success: true, data: mapSiteSettings(res.data) }
  },

  /**
   * Admin: Updates site settings configuration.
   */
  async adminUpdateSettings(
    patch: Partial<{
      contact_info: SiteSettings['contactInfo']
      announcement_bar: SiteSettings['announcementBar']
      hero_slides: SiteSettings['heroSlides']
      promo_banners: SiteSettings['promoBanners']
      store_description: string
      shipping_rules: {
        shipping_charge_paisa: number
        free_shipping_threshold_paisa: number
      }
      shiprocket_settings: {
        pickup_location: string
        default_length_cm: number
        default_breadth_cm: number
        default_height_cm: number
        default_weight_grams: number
      }
    }>
  ): Promise<ApiResponse<SiteSettings>> {
    const res = await api.patch<RawSettingsResponse>('/api/admin/settings', patch, true)
    if (!res.success || !res.data) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update settings' },
      }
    }
    return { success: true, data: mapSiteSettings(res.data) }
  },
}
