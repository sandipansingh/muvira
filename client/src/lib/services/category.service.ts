import { api } from '../api/client'
import { mapCategory } from '../utils/adapters'
import type { Category } from '../types/category'
import type { ApiResponse } from '../types/common'

/**
 * Storefront Category API service functions.
 */
export const categoryService = {
  /**
   * Fetches list of active product categories.
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>[]
      error?: { code: string; message: string }
    }>('/api/categories')

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'FETCH_CATEGORIES_FAILED', message: 'Failed to fetch categories' },
      }
    }

    return { success: true, data: res.data.map(mapCategory) }
  },

  /**
   * Fetches category details by URL slug.
   */
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/categories/${encodeURIComponent(slug)}`)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'NOT_FOUND', message: 'Category not found' },
      }
    }

    return { success: true, data: mapCategory(res.data) }
  },
}
