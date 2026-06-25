import { api } from './client'
import { mapProductListItem, mapProductDetail } from './adapters'
import type { ProductListItem, ProductDetail, ProductQueryParams } from '../../types/product'
import type { ApiPaginatedResponse, ApiResponse } from '../../types/common'

export const productsApiService = {
  async getProducts(
    params: ProductQueryParams = {}
  ): Promise<ApiPaginatedResponse<ProductListItem>> {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice))
    if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice))
    if (params.inStock) qs.set('inStock', 'true')
    if (params.sort) qs.set('sort', params.sort)

    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>[]
      meta?: { page: number; limit: number; total: number; totalPages: number }
      error?: { code: string; message: string }
    }>(`/api/products?${qs.toString()}`)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch products' },
      }
    }

    return {
      success: true,
      data: res.data.map(mapProductListItem),
      pagination: {
        page: res.meta?.page ?? 1,
        limit: res.meta?.limit ?? 20,
        total: res.meta?.total ?? 0,
        totalPages: res.meta?.totalPages ?? 1,
      },
    }
  },

  async getProductBySlug(slug: string): Promise<ApiResponse<ProductDetail>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>
      error?: { code: string; message: string }
    }>(`/api/products/${encodeURIComponent(slug)}`)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'NOT_FOUND', message: 'Product not found' },
      }
    }

    return { success: true, data: mapProductDetail(res.data) }
  },

  async getRelatedProducts(productId: string): Promise<ApiResponse<ProductListItem[]>> {
    const res = await api.get<{
      success: boolean
      data?: Record<string, unknown>[]
      error?: { code: string; message: string }
    }>(`/api/products/${encodeURIComponent(productId)}/related`)

    if (!res.success || !res.data) {
      return { success: true, data: [] }
    }

    return { success: true, data: res.data.map(mapProductListItem) }
  },
}
