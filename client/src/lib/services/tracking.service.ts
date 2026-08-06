import { api } from '../api/client'
import type { ShiprocketTrackData } from '../types/order'

interface ServerTrackSingle {
  success: boolean
  data?: { tracking_data: ShiprocketTrackData }
  error?: { code: string; message: string }
}

interface ServerTrackBulk {
  success: boolean
  data?: Record<string, { tracking_data: ShiprocketTrackData }>
  error?: { code: string; message: string }
}

/**
 * Public and bulk shipment tracking API service.
 */
export const trackingService = {
  /**
   * Tracks a single shipment by AWB tracking code.
   */
  async trackSingle(awb: string): Promise<ShiprocketTrackData | null> {
    try {
      const res = await api.get<ServerTrackSingle>(`/api/tracking/${encodeURIComponent(awb)}`)
      if (res.success && res.data?.tracking_data) {
        return res.data.tracking_data
      }
      return null
    } catch {
      return null
    }
  },

  /**
   * Batch tracks multiple shipments by AWB codes (used in Admin Orders list).
   */
  async trackBulk(awbs: string[]): Promise<Record<string, ShiprocketTrackData>> {
    if (awbs.length === 0) return {}

    try {
      const res = await api.post<ServerTrackBulk>('/api/tracking/bulk', {
        awbs,
      })

      if (!res.success || !res.data) return {}

      const result: Record<string, ShiprocketTrackData> = {}
      for (const [awb, val] of Object.entries(res.data)) {
        if (val?.tracking_data) {
          result[awb] = val.tracking_data
        }
      }
      return result
    } catch {
      return {}
    }
  },
}
