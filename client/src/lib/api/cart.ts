import { api } from './client';
import { buildCart, mapCartItem } from './adapters';
import type { Cart } from '../../types/cart';
import type { ApiResponse } from '../../types/common';

export const cartApiService = {
  async getCart(): Promise<ApiResponse<Cart>> {
    const res = await api.get<{
      success: boolean;
      data?: Record<string, unknown>[];
      error?: { code: string; message: string };
    }>('/api/cart', true);

    if (!res.success || !res.data) {
      // Return empty cart for unauthenticated users or errors
      return { success: true, data: { items: [], subtotal: 0, itemCount: 0 } };
    }

    return { success: true, data: buildCart(res.data) };
  },

  async addToCart(productId: string, quantity: number): Promise<ApiResponse<{ productName: string }>> {
    const res = await api.post<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>('/api/cart', { product_id: productId, quantity }, true);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to add item' } };
    }

    const item = mapCartItem(res.data);
    return { success: true, data: { productName: item.productName } };
  },

  async updateCartItem(itemId: string, quantity: number): Promise<ApiResponse<Cart>> {
    const res = await api.patch<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>(`/api/cart/${encodeURIComponent(itemId)}`, { quantity }, true);

    if (!res.success) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to update item' } };
    }

    // Re-fetch full cart after update
    return cartApiService.getCart();
  },

  async deleteCartItem(itemId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await api.delete<{
      success: boolean;
      error?: { code: string; message: string };
    }>(`/api/cart/${encodeURIComponent(itemId)}`, true);

    if (!res.success) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to remove item' } };
    }

    return { success: true, data: { deleted: true } };
  },
};
