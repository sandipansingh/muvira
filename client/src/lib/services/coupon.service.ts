import { api } from '../api/client'
import { mapCouponPreview } from '../utils/adapters'
import type { CouponPreview } from '../types/coupon'
import type { ApiResponse } from '../types/common'

/**
 * Coupon validation and preview API service functions.
 */
export const couponApiService = {
  /**
   * Applies a promo coupon code to a cart subtotal and calculates discount.
   */
  async applyCoupon(code: string, cartSubtotal: number): Promise<ApiResponse<CouponPreview>> {
    const res = await api.post<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>('/api/checkout/apply', { code, subtotal_paisa: cartSubtotal }, true)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'INVALID_COUPON', message: 'Invalid coupon' },
      }
    }

    const enriched = { ...res.data, subtotal_paisa: cartSubtotal }
    return { success: true, data: mapCouponPreview(enriched) }
  },

  /**
   * Resets coupon state client-side.
   */
  async removeCoupon(): Promise<ApiResponse<{ removed: boolean }>> {
    return { success: true, data: { removed: true } }
  },
}
