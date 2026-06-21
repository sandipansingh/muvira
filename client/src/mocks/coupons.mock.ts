import { delay } from './delay';
import { MockDatabase } from './store';
import type { CouponPreview } from '../types/coupon';
import type { ApiResponse } from '../types/common';

export const couponsMockService = {
  async applyCoupon(code: string, cartSubtotal: number): Promise<ApiResponse<CouponPreview>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    if (MockDatabase.getErrorToggles().simulateCouponError) {
      return {
        success: false,
        error: { code: 'INVALID_COUPON', message: 'Coupon invalid due to debug settings.' },
      };
    }

    const coupons = MockDatabase.getCoupons();
    const coupon = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());

    if (!coupon) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coupon code does not exist.' },
      };
    }

    const now = new Date();
    const from = new Date(coupon.validFrom);
    const until = new Date(coupon.validUntil);

    if (!coupon.isActive) {
      return {
        success: false,
        error: { code: 'INVALID_COUPON', message: 'This coupon is no longer active.' },
      };
    }

    if (now < from || now > until) {
      return {
        success: false,
        error: { code: 'INVALID_COUPON', message: 'This coupon has expired.' },
      };
    }

    if (cartSubtotal < coupon.minOrderAmount) {
      const minVal = coupon.minOrderAmount / 100;
      return {
        success: false,
        error: {
          code: 'INVALID_COUPON',
          message: `Minimum order amount of ₹${minVal.toLocaleString('en-IN')} is required to use this coupon.`,
        },
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((coupon.discountValue / 100) * cartSubtotal);
      if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    if (discountAmount > cartSubtotal) {
      discountAmount = cartSubtotal;
    }

    const newSubtotal = cartSubtotal - discountAmount;

    return {
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        newSubtotal,
      },
    };
  },

  async removeCoupon(): Promise<ApiResponse<{ removed: boolean }>> {
    await delay(100);
    return {
      success: true,
      data: { removed: true },
    };
  },
};
