import { api } from './client';
import { mapCouponPreview } from './adapters';
import type { CouponPreview } from '../../types/coupon';
import type { ApiResponse } from '../../types/common';

export const couponsApiService = {
  async applyCoupon(code: string, cartSubtotal: number): Promise<ApiResponse<CouponPreview>> {
    const res = await api.post<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>('/api/checkout/apply', { code, subtotal_paisa: cartSubtotal }, true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'INVALID_COUPON', message: 'Invalid coupon' } };
    }

    // Server returns: { code, discount_type, discount_value, discount_amount_paisa }
    // We also need newSubtotal for the preview, so attach subtotal context
    const enriched = { ...res.data, subtotal_paisa: cartSubtotal };
    return { success: true, data: mapCouponPreview(enriched) };
  },

  async removeCoupon(): Promise<ApiResponse<{ removed: boolean }>> {
    // Coupon state is client-side only — no server call needed for removal
    return { success: true, data: { removed: true } };
  },
};
