import { api } from '../../api/client'
import {
  mapProductDetail,
  mapCategory,
  mapCoupon,
  mapOrderDetail,
  mapDashboardStats,
  mapInventoryItem,
} from '../../utils/adapters'
import { slugify } from '../../utils/slug'
import type { ProductDetail } from '../../types/product'
import type { Category } from '../../types/category'
import type { Coupon } from '../../types/coupon'
import type { OrderDetail } from '../../types/order'
import type { DashboardStats, InventoryItem } from '../../types/dashboard'
import type { ApiResponse, ApiPaginatedResponse } from '../../types/common'
import type {
  FulfillOrderInput,
  FulfillOrderResult,
  ServiceabilityResult,
} from '../../types/order'

type AnyRecord = Record<string, unknown>

async function adminGet<T>(path: string) {
  return api.get<T>(path, true)
}
async function adminPost<T>(path: string, body?: unknown) {
  return api.post<T>(path, body, true)
}
async function adminPatch<T>(path: string, body?: unknown) {
  return api.patch<T>(path, body, true)
}
async function adminDelete<T>(path: string) {
  return api.delete<T>(path, true)
}

/**
 * Complete Admin Operations API Service.
 */
export const adminApiService = {
  /**
   * Fetches dashboard metric aggregates (orders, revenue, products, categories, coupons, low stock count).
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>('/api/admin/dashboard/stats')
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch dashboard stats' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapDashboardStats(res.data) }
  },

  /**
   * Fetches paginated inventory list with low stock filtering.
   */
  async getInventory(
    page = 1,
    limit = 50,
    lowStockOnly = false
  ): Promise<ApiPaginatedResponse<InventoryItem>> {
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/inventory?page=${page}&limit=${limit}&low_stock_only=${lowStockOnly}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch inventory' }) as {
          code: string
          message: string
        },
      }
    return {
      success: true,
      data: res.data.map(mapInventoryItem),
      pagination: {
        page,
        limit,
        total: (res.meta?.['total'] as number) ?? 0,
        totalPages: (res.meta?.['totalPages'] as number) ?? 1,
      },
    }
  },

  /**
   * Fetches admin products list with search and category filters.
   */
  async getProducts(
    params: {
      page?: number
      limit?: number
      q?: string
      category?: string
    } = {}
  ): Promise<ApiPaginatedResponse<ProductDetail>> {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)

    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/products?${qs}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch products' }) as {
          code: string
          message: string
        },
      }
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    return {
      success: true,
      data: res.data.map(mapProductDetail),
      pagination: {
        page,
        limit,
        total: (res.meta?.['total'] as number) ?? 0,
        totalPages: (res.meta?.['totalPages'] as number) ?? 1,
      },
    }
  },

  /**
   * Creates a new product catalog item.
   */
  async createProduct(data: AnyRecord): Promise<ApiResponse<ProductDetail>> {
    const name = data['name'] as string
    const price = data['price'] as number
    const salePrice = data['salePrice'] as number | null | undefined

    const body: AnyRecord = {
      name,
      slug: data['slug'] || slugify(name || ''),
      description: data['description'],
      short_description: data['shortDescription'] ?? data['short_description'],
      category_id: data['categoryId'] ?? data['category_id'],
      price_paisa: salePrice ? salePrice : price,
      compare_at_price_paisa: salePrice ? price : null,
      sku: data['sku'],
      stock: data['stock'],
      is_active: data['isActive'] ?? data['is_active'] ?? true,
      is_featured: data['isFeatured'] ?? data['is_featured'] ?? false,
      metadata: data['metadata'],
    }

    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>('/api/admin/products', body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to create product' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapProductDetail(res.data) }
  },

  /**
   * Updates an existing product item.
   */
  async updateProduct(id: string, data: AnyRecord): Promise<ApiResponse<ProductDetail>> {
    const body: AnyRecord = {}
    if (data['name'] !== undefined) body['name'] = data['name']
    if (data['slug'] !== undefined) body['slug'] = data['slug']
    if (data['description'] !== undefined) body['description'] = data['description']
    if (data['shortDescription'] !== undefined) body['short_description'] = data['shortDescription']
    if (data['short_description'] !== undefined)
      body['short_description'] = data['short_description']
    if (data['categoryId'] !== undefined) body['category_id'] = data['categoryId']
    if (data['category_id'] !== undefined) body['category_id'] = data['category_id']
    if (data['price'] !== undefined || data['salePrice'] !== undefined) {
      const price = data['price'] as number
      const salePrice = data['salePrice'] as number | null | undefined
      body['price_paisa'] = salePrice ? salePrice : price
      body['compare_at_price_paisa'] = salePrice ? price : null
    }
    if (data['sku'] !== undefined) body['sku'] = data['sku']
    if (data['stock'] !== undefined) body['stock'] = data['stock']
    if (data['isActive'] !== undefined) body['is_active'] = data['isActive']
    if (data['is_active'] !== undefined) body['is_active'] = data['is_active']
    if (data['isFeatured'] !== undefined) body['is_featured'] = data['isFeatured']
    if (data['is_featured'] !== undefined) body['is_featured'] = data['is_featured']
    if (data['metadata'] !== undefined) body['metadata'] = data['metadata']

    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/products/${id}`, body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to update product' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapProductDetail(res.data) }
  },

  /**
   * Soft deletes a product by setting is_active = false.
   */
  async deleteProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/products/${id}`
    )
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to delete product' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: { deleted: true } }
  },

  /**
   * Uploads multiple product images and associates them with a product.
   */
  async uploadProductImages(
    productId: string,
    urls: string[]
  ): Promise<ApiResponse<ProductDetail>> {
    for (const url of urls) {
      await adminPost(`/api/admin/products/${productId}/images`, {
        url,
        is_primary: urls.indexOf(url) === 0,
      })
    }
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/products/${productId}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: { code: 'UNKNOWN', message: 'Failed to fetch updated product' },
      }
    return { success: true, data: mapProductDetail(res.data) }
  },

  /**
   * Deletes a specific product image.
   */
  async deleteProductImage(
    productId: string,
    imageId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/products/${productId}/images/${imageId}`
    )
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to delete product image' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: { deleted: true } }
  },

  /**
   * Reorders product images.
   */
  async reorderProductImages(
    productId: string,
    imageIds: string[]
  ): Promise<ApiResponse<ProductDetail>> {
    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/products/${productId}/images/reorder`, { imageIds })

    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to reorder images' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapProductDetail(res.data) }
  },

  /**
   * Fetches full categories list.
   */
  async getCategoriesList(): Promise<ApiResponse<Category[]>> {
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>('/api/admin/categories?limit=100')
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch categories' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: res.data.map(mapCategory) }
  },

  /**
   * Fetches paginated categories.
   */
  async getCategories(
    params: { page?: number; limit?: number; q?: string } = {}
  ): Promise<ApiPaginatedResponse<Category>> {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 20))
    if (params.q) qs.set('q', params.q)

    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/categories?${qs}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch categories' }) as {
          code: string
          message: string
        },
      }
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    return {
      success: true,
      data: res.data.map(mapCategory),
      pagination: {
        page,
        limit,
        total: (res.meta?.['total'] as number) ?? 0,
        totalPages: (res.meta?.['totalPages'] as number) ?? 1,
      },
    }
  },

  /**
   * Creates a new category.
   */
  async createCategory(data: AnyRecord): Promise<ApiResponse<Category>> {
    const name = data['name'] as string
    const body = {
      name,
      slug: data['slug'] || slugify(name || ''),
      description: data['description'],
      image_url: data['imageUrl'] ?? data['image_url'],
      is_active: data['isActive'] ?? data['is_active'] ?? true,
      sort_order: data['sortOrder'] ?? data['sort_order'] ?? 0,
      show_in_navbar: data['showInNavbar'] ?? data['show_in_navbar'] ?? false,
    }
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>('/api/admin/categories', body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to create category' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapCategory(res.data) }
  },

  /**
   * Updates an existing category.
   */
  async updateCategory(id: string, data: AnyRecord): Promise<ApiResponse<Category>> {
    const body: AnyRecord = {}
    if (data['name'] !== undefined) body['name'] = data['name']
    if (data['slug'] !== undefined) body['slug'] = data['slug']
    if (data['description'] !== undefined) body['description'] = data['description']
    if (data['imageUrl'] !== undefined) body['image_url'] = data['imageUrl']
    if (data['image_url'] !== undefined) body['image_url'] = data['image_url']
    if (data['isActive'] !== undefined) body['is_active'] = data['isActive']
    if (data['is_active'] !== undefined) body['is_active'] = data['is_active']
    if (data['sortOrder'] !== undefined) body['sort_order'] = data['sortOrder']
    if (data['showInNavbar'] !== undefined) body['show_in_navbar'] = data['showInNavbar']
    if (data['show_in_navbar'] !== undefined) body['show_in_navbar'] = data['show_in_navbar']

    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/categories/${id}`, body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to update category' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapCategory(res.data) }
  },

  /**
   * Deletes a category.
   */
  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/categories/${id}`
    )
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to delete category' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: { deleted: true } }
  },

  /**
   * Fetches admin coupons list.
   */
  async getCoupons(
    params: { page?: number; limit?: number } = {}
  ): Promise<ApiPaginatedResponse<Coupon>> {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 20))

    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/coupons?${qs}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch coupons' }) as {
          code: string
          message: string
        },
      }
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    return {
      success: true,
      data: res.data.map(mapCoupon),
      pagination: {
        page,
        limit,
        total: (res.meta?.['total'] as number) ?? 0,
        totalPages: (res.meta?.['totalPages'] as number) ?? 1,
      },
    }
  },

  /**
   * Creates a promo coupon.
   */
  async createCoupon(data: AnyRecord): Promise<ApiResponse<Coupon>> {
    const body = {
      code: (data['code'] as string).toUpperCase(),
      description: data['description'],
      discount_type: data['discountType'] ?? data['discount_type'],
      discount_value: data['discountValue'] ?? data['discount_value'],
      min_order_amount_paisa: data['minOrderAmount'] ?? data['min_order_amount_paisa'] ?? 0,
      max_discount_paisa: data['maxDiscountAmount'] ?? data['max_discount_paisa'],
      max_uses: data['usageLimit'] ?? data['max_uses'],
      is_active: data['isActive'] ?? data['is_active'] ?? true,
      valid_from: data['validFrom'] ?? data['valid_from'],
      valid_until: data['validUntil'] ?? data['valid_until'],
    }
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>('/api/admin/coupons', body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to create coupon' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapCoupon(res.data) }
  },

  /**
   * Updates an existing coupon.
   */
  async updateCoupon(id: string, data: AnyRecord): Promise<ApiResponse<Coupon>> {
    const body: AnyRecord = {}
    if (data['code'] !== undefined) body['code'] = (data['code'] as string).toUpperCase()
    if (data['description'] !== undefined) body['description'] = data['description']
    if (data['discountType'] !== undefined) body['discount_type'] = data['discountType']
    if (data['discountValue'] !== undefined) body['discount_value'] = data['discountValue']
    if (data['minOrderAmount'] !== undefined)
      body['min_order_amount_paisa'] = data['minOrderAmount']
    if (data['maxDiscountAmount'] !== undefined)
      body['max_discount_paisa'] = data['maxDiscountAmount']
    if (data['usageLimit'] !== undefined) body['max_uses'] = data['usageLimit']
    if (data['isActive'] !== undefined) body['is_active'] = data['isActive']
    if (data['validFrom'] !== undefined) body['valid_from'] = data['validFrom']
    if (data['validUntil'] !== undefined) body['valid_until'] = data['validUntil']

    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/coupons/${id}`, body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to update coupon' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapCoupon(res.data) }
  },

  /**
   * Deactivates a coupon by setting is_active = false.
   */
  async deactivateCoupon(id: string): Promise<ApiResponse<Coupon>> {
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/coupons/${id}/deactivate`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to deactivate coupon' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapCoupon(res.data) }
  },

  /**
   * Triggers background Shiprocket order status tracking sync.
   */
  async syncTrackingOrders(): Promise<ApiResponse<{ totalChecked: number; totalUpdated: number }>> {
    const res = await adminPost<{
      success: boolean
      data?: { totalChecked: number; totalUpdated: number }
      error?: AnyRecord
    }>('/api/admin/orders/sync-tracking')
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to sync tracking orders' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: res.data }
  },

  /**
   * Fetches admin orders list.
   */
  async getOrders(
    params: { page?: number; limit?: number; status?: string; q?: string } = {}
  ): Promise<ApiPaginatedResponse<OrderDetail>> {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.status) qs.set('status', params.status)
    if (params.q) qs.set('q', params.q)

    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      meta?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders?${qs}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch orders' }) as {
          code: string
          message: string
        },
      }
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    return {
      success: true,
      data: res.data.map(mapOrderDetail),
      pagination: {
        page,
        limit,
        total: (res.meta?.['total'] as number) ?? 0,
        totalPages: (res.meta?.['totalPages'] as number) ?? 1,
      },
    }
  },

  /**
   * Updates order lifecycle status.
   */
  async updateOrderStatus(id: string, status: string): Promise<ApiResponse<OrderDetail>> {
    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/status`, { status })
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to update order status' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Updates order fulfillment details (e.g. AWB code).
   */
  async updateOrderFulfillment(
    id: string,
    data: {
      awbCode?: string | null
    }
  ): Promise<ApiResponse<OrderDetail>> {
    const body: AnyRecord = {}
    if (data.awbCode !== undefined) body['awb_code'] = data.awbCode

    const res = await adminPatch<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/fulfillment`, body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to update fulfillment' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Appends an internal admin note to an order.
   */
  async addOrderNote(id: string, note: string): Promise<ApiResponse<OrderDetail>> {
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/notes`, { note })
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to add note' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Assigns AWB code for order shipment.
   */
  async assignAwb(id: string, courierId?: number): Promise<ApiResponse<OrderDetail>> {
    const body: AnyRecord = {}
    if (courierId !== undefined) body['courier_id'] = courierId
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/assign-awb`, body)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to assign AWB' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Schedules shipment pickup.
   */
  async schedulePickup(id: string): Promise<ApiResponse<{ status: string }>> {
    const res = await adminPost<{
      success: boolean
      data?: { status: string }
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/schedule-pickup`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to schedule pickup' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: res.data }
  },

  /**
   * Cancels a Shiprocket order.
   */
  async cancelShiprocketOrder(id: string): Promise<ApiResponse<{ status: string }>> {
    const res = await adminPost<{
      success: boolean
      data?: { status: string }
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/shiprocket-cancel`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to cancel Shiprocket order' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: res.data }
  },

  /**
   * Fetches single order details for admin view.
   */
  async getOrderById(id: string): Promise<ApiResponse<OrderDetail>> {
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}`)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch order' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Creates a shipment in Shiprocket for an order.
   */
  async createShipment(id: string, pickupLocation: string): Promise<ApiResponse<OrderDetail>> {
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/create-shipment`, { pickup_location: pickupLocation })
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to create shipment' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: mapOrderDetail(res.data) }
  },

  /**
   * Fetches registered Shiprocket pickup locations.
   */
  async getPickupLocations(): Promise<
    ApiResponse<
      Array<{
        pickup_location: string
        id: number
        address: string
        city: string
        state: string
        pin_code: string
      }>
    >
  > {
    const res = await adminGet<{
      success: boolean
      data?: AnyRecord[]
      error?: AnyRecord
    }>('/api/admin/shiprocket/pickup-locations')
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch pickup locations' }) as {
          code: string
          message: string
        },
      }
    type PickupLocationItem = {
      pickup_location: string
      id: number
      address: string
      city: string
      state: string
      pin_code: string
    }
    return { success: true, data: res.data as unknown as PickupLocationItem[] }
  },

  /**
   * Checks courier serviceability for delivery pincode.
   */
  async checkServiceability(params: {
    pickup_pincode: string
    delivery_pincode: string
    weight: number
    cod: boolean
  }): Promise<ApiResponse<ServiceabilityResult>> {
    const res = await adminPost<{
      success: boolean
      data?: ServiceabilityResult
      error?: AnyRecord
    }>('/api/admin/shiprocket/check-serviceability', params)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Failed to check serviceability' }) as {
          code: string
          message: string
        },
      }
    return { success: true, data: res.data }
  },

  /**
   * Executes multi-step order fulfillment workflow in Shiprocket.
   */
  async fulfillOrder(
    id: string,
    params: FulfillOrderInput
  ): Promise<ApiResponse<FulfillOrderResult>> {
    const res = await adminPost<{
      success: boolean
      data?: AnyRecord
      error?: AnyRecord
    }>(`/api/admin/orders/${id}/fulfill`, params)
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: 'UNKNOWN', message: 'Fulfillment failed' }) as {
          code: string
          message: string
        },
      }
    return {
      success: true,
      data: {
        success: (res.data['success'] as boolean) ?? false,
        order: mapOrderDetail(res.data['order'] as AnyRecord),
        steps: (res.data['steps'] as FulfillOrderResult['steps']) ?? [],
        shiprocket_order_id: (res.data['shiprocket_order_id'] as number | null) ?? null,
        shipment_id: (res.data['shipment_id'] as number | null) ?? null,
        awb_code: (res.data['awb_code'] as string | null) ?? null,
        courier_name: (res.data['courier_name'] as string | null) ?? null,
        label_generated: (res.data['label_generated'] as boolean) ?? false,
        manifest_generated: (res.data['manifest_generated'] as boolean) ?? false,
        pickup_scheduled_date: (res.data['pickup_scheduled_date'] as string | null) ?? null,
        error: res.data['error'] as string | undefined,
        failed_step: res.data['failed_step'] as string | undefined,
      },
    }
  },
}
