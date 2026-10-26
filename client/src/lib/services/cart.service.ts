import { api } from '../api/client'
import { buildCart, mapCartItem } from '../utils/adapters'
import type { Cart } from '../types/cart'
import type { ApiResponse } from '../types/common'

/**
 * Server-synchronized Cart API service functions.
 */
export const cartApiService = {
  async mergeGuestItem(operationId: string, productId: string, quantity: number, userId: string) {
    const response = await api.post<{
      success: boolean
      data?: { status: 'applied' | 'rejected'; message?: string }
      error?: { message: string }
    }>(
      '/api/cart/merge',
      { operation_id: operationId, product_id: productId, quantity },
      true,
      userId
    )
    if (
      response.success !== true ||
      !response.data ||
      !['applied', 'rejected'].includes(response.data.status)
    ) {
      throw new Error('Cart transfer confirmation is invalid. Retry to confirm its status.')
    }
    return response
  },
  /**
   * Fetches the user's server cart items and subtotals.
   */
  async getCart(userId: string): Promise<ApiResponse<Cart>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>[]
      error?: { code: string; message: string }
    }>('/api/cart', true, userId)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'FETCH_CART_FAILED', message: 'Failed to fetch cart' },
      }
    }

    return { success: true, data: buildCart(res.data) }
  },

  /**
   * Adds an item to the server cart with specified quantity.
   */
  async addToCart(
    productId: string,
    quantity: number,
    userId: string
  ): Promise<ApiResponse<{ productName: string }>> {
    const res = await api.post<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>('/api/cart', { product_id: productId, quantity }, true, userId)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'ADD_TO_CART_FAILED', message: 'Failed to add item to cart' },
      }
    }

    const item = mapCartItem(res.data)
    return { success: true, data: { productName: item.productName } }
  },

  /**
   * Updates quantity for an existing cart item and returns refreshed cart.
   */
  async updateCartItem(
    itemId: string,
    quantity: number,
    userId: string
  ): Promise<ApiResponse<Cart>> {
    const res = await api.patch<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/cart/${encodeURIComponent(itemId)}`, { quantity }, true, userId)

    if (!res.success) {
      return {
        success: false,
        error: res.error ?? { code: 'UPDATE_CART_FAILED', message: 'Failed to update cart item' },
      }
    }

    return cartApiService.getCart(userId)
  },

  /**
   * Deletes a item from the server cart.
   */
  async deleteCartItem(itemId: string, userId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await api.delete<{
      success: boolean
      error?: { code: string; message: string }
    }>(`/api/cart/${encodeURIComponent(itemId)}`, true, userId)

    if (!res.success) {
      return {
        success: false,
        error: res.error ?? { code: 'DELETE_CART_FAILED', message: 'Failed to remove cart item' },
      }
    }

    return { success: true, data: { deleted: true } }
  },

  async clearCart(userId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await api.delete<{ success: boolean; error?: { code: string; message: string } }>(
      '/api/cart',
      true,
      userId
    )

    if (!res.success) {
      return {
        success: false,
        error: res.error ?? { code: 'CLEAR_CART_FAILED', message: 'Failed to clear cart' },
      }
    }

    return { success: true, data: { deleted: true } }
  },
}
