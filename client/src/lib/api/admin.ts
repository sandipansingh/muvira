/**
 * Admin API service — mirrors the adminMockService interface exactly so
 * admin pages only need to change the import statement.
 */
import { api } from "./client";
import {
  mapProductDetail,
  mapCategory,
  mapCoupon,
  mapCampaign,
  mapOrderDetail,
  mapDashboardStats,
  mapInventoryItem,
} from "./adapters";
import type { ProductDetail } from "../../types/product";
import type { Category } from "../../types/category";
import type { Coupon } from "../../types/coupon";
import type { Campaign } from "../../types/campaign";
import type { OrderDetail } from "../../types/order";
import type { DashboardStats, InventoryItem } from "../../types/dashboard";
import type { ApiResponse, ApiPaginatedResponse } from "../../types/common";

type AnyRecord = Record<string, unknown>;

async function adminGet<T>(path: string) {
  return api.get<T>(path, true);
}
async function adminPost<T>(path: string, body?: unknown) {
  return api.post<T>(path, body, true);
}
async function adminPatch<T>(path: string, body?: unknown) {
  return api.patch<T>(path, body, true);
}
async function adminDelete<T>(path: string) {
  return api.delete<T>(path, true);
}

export const adminApiService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>("/api/admin/dashboard/stats");
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapDashboardStats(res.data) };
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  async getInventory(
    page = 1,
    limit = 50,
  ): Promise<ApiPaginatedResponse<InventoryItem>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      meta?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/inventory?page=${page}&limit=${limit}`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return {
      success: true,
      data: res.data.map(mapInventoryItem),
      pagination: {
        page,
        limit,
        total: (res.meta?.["total"] as number) ?? 0,
        totalPages: (res.meta?.["totalPages"] as number) ?? 1,
      },
    };
  },

  // ── Products ───────────────────────────────────────────────────────────────
  async getProducts(
    params: {
      page?: number;
      limit?: number;
      q?: string;
      category?: string;
    } = {},
  ): Promise<ApiPaginatedResponse<ProductDetail>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);

    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      meta?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/products?${qs}`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    return {
      success: true,
      data: res.data.map(mapProductDetail),
      pagination: {
        page,
        limit,
        total: (res.meta?.["total"] as number) ?? 0,
        totalPages: (res.meta?.["totalPages"] as number) ?? 1,
      },
    };
  },

  async createProduct(data: AnyRecord): Promise<ApiResponse<ProductDetail>> {
    // Convert camelCase frontend fields to snake_case server fields
    const body: AnyRecord = {
      name: data["name"],
      slug: data["slug"],
      description: data["description"],
      short_description: data["shortDescription"] ?? data["short_description"],
      category_id: data["categoryId"] ?? data["category_id"],
      price_paisa: data["pricePaisa"] ?? data["price_paisa"] ?? data["price"],
      compare_at_price_paisa:
        data["compareAtPricePaisa"] ??
        data["compare_at_price_paisa"] ??
        data["salePrice"] ??
        undefined,
      sku: data["sku"],
      stock: data["stock"],
      is_active: data["isActive"] ?? data["is_active"] ?? true,
      is_featured: data["isFeatured"] ?? data["is_featured"] ?? false,
    };

    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>("/api/admin/products", body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapProductDetail(res.data) };
  },

  async updateProduct(
    id: string,
    data: AnyRecord,
  ): Promise<ApiResponse<ProductDetail>> {
    const body: AnyRecord = {};
    if (data["name"] !== undefined) body["name"] = data["name"];
    if (data["slug"] !== undefined) body["slug"] = data["slug"];
    if (data["description"] !== undefined)
      body["description"] = data["description"];
    if (data["shortDescription"] !== undefined)
      body["short_description"] = data["shortDescription"];
    if (data["short_description"] !== undefined)
      body["short_description"] = data["short_description"];
    if (data["categoryId"] !== undefined)
      body["category_id"] = data["categoryId"];
    if (data["category_id"] !== undefined)
      body["category_id"] = data["category_id"];
    if (data["pricePaisa"] !== undefined)
      body["price_paisa"] = data["pricePaisa"];
    if (data["price_paisa"] !== undefined)
      body["price_paisa"] = data["price_paisa"];
    if (data["price"] !== undefined) body["price_paisa"] = data["price"];
    if (data["salePrice"] !== undefined)
      body["compare_at_price_paisa"] = data["salePrice"];
    if (data["compare_at_price_paisa"] !== undefined)
      body["compare_at_price_paisa"] = data["compare_at_price_paisa"];
    if (data["sku"] !== undefined) body["sku"] = data["sku"];
    if (data["stock"] !== undefined) body["stock"] = data["stock"];
    if (data["isActive"] !== undefined) body["is_active"] = data["isActive"];
    if (data["is_active"] !== undefined) body["is_active"] = data["is_active"];
    if (data["isFeatured"] !== undefined)
      body["is_featured"] = data["isFeatured"];
    if (data["is_featured"] !== undefined)
      body["is_featured"] = data["is_featured"];

    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/products/${id}`, body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapProductDetail(res.data) };
  },

  async deleteProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/products/${id}`,
    );
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: { deleted: true } };
  },

  async uploadProductImages(
    productId: string,
    urls: string[],
  ): Promise<ApiResponse<ProductDetail>> {
    // POST each image URL sequentially
    for (const url of urls) {
      await adminPost(`/api/admin/products/${productId}/images`, {
        url,
        is_primary: urls.indexOf(url) === 0,
      });
    }
    // Re-fetch and return updated product
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/products/${productId}`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: { code: "UNKNOWN", message: "Failed to fetch updated product" },
      };
    return { success: true, data: mapProductDetail(res.data) };
  },

  async deleteProductImage(
    productId: string,
    imageId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/products/${productId}/images/${imageId}`,
    );
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: { deleted: true } };
  },

  async reorderProductImages(
    _productId: string,
    _order: unknown[],
  ): Promise<ApiResponse<ProductDetail>> {
    // Not supported by the server API — no-op
    return {
      success: false,
      error: { code: "NOT_SUPPORTED", message: "Image reorder not supported" },
    };
  },

  // ── Categories ─────────────────────────────────────────────────────────────
  async getCategoriesList(): Promise<ApiResponse<Category[]>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      error?: AnyRecord;
    }>("/api/admin/categories");
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: res.data.map(mapCategory) };
  },

  async createCategory(data: AnyRecord): Promise<ApiResponse<Category>> {
    const body = {
      name: data["name"],
      slug: data["slug"],
      description: data["description"],
      image_url: data["imageUrl"] ?? data["image_url"],
      is_active: data["isActive"] ?? data["is_active"] ?? true,
      sort_order: data["sortOrder"] ?? data["sort_order"] ?? 0,
    };
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>("/api/admin/categories", body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCategory(res.data) };
  },

  async updateCategory(
    id: string,
    data: AnyRecord,
  ): Promise<ApiResponse<Category>> {
    const body: AnyRecord = {};
    if (data["name"] !== undefined) body["name"] = data["name"];
    if (data["slug"] !== undefined) body["slug"] = data["slug"];
    if (data["description"] !== undefined)
      body["description"] = data["description"];
    if (data["imageUrl"] !== undefined) body["image_url"] = data["imageUrl"];
    if (data["image_url"] !== undefined) body["image_url"] = data["image_url"];
    if (data["isActive"] !== undefined) body["is_active"] = data["isActive"];
    if (data["is_active"] !== undefined) body["is_active"] = data["is_active"];
    if (data["sortOrder"] !== undefined) body["sort_order"] = data["sortOrder"];

    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/categories/${id}`, body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCategory(res.data) };
  },

  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await adminDelete<{ success: boolean; error?: AnyRecord }>(
      `/api/admin/categories/${id}`,
    );
    if (!res.success)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: { deleted: true } };
  },

  // ── Coupons ────────────────────────────────────────────────────────────────
  async getCoupons(): Promise<ApiResponse<Coupon[]>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      error?: AnyRecord;
    }>("/api/admin/coupons");
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: res.data.map(mapCoupon) };
  },

  async createCoupon(data: AnyRecord): Promise<ApiResponse<Coupon>> {
    const body = {
      code: (data["code"] as string).toUpperCase(),
      description: data["description"],
      discount_type: data["discountType"] ?? data["discount_type"],
      discount_value: data["discountValue"] ?? data["discount_value"],
      min_order_amount_paisa:
        data["minOrderAmount"] ?? data["min_order_amount_paisa"] ?? 0,
      max_discount_paisa:
        data["maxDiscountAmount"] ?? data["max_discount_paisa"],
      max_uses: data["usageLimit"] ?? data["max_uses"],
      is_active: data["isActive"] ?? data["is_active"] ?? true,
      valid_from: data["validFrom"] ?? data["valid_from"],
      valid_until: data["validUntil"] ?? data["valid_until"],
    };
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>("/api/admin/coupons", body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCoupon(res.data) };
  },

  async updateCoupon(
    id: string,
    data: AnyRecord,
  ): Promise<ApiResponse<Coupon>> {
    const body: AnyRecord = {};
    if (data["code"] !== undefined)
      body["code"] = (data["code"] as string).toUpperCase();
    if (data["description"] !== undefined)
      body["description"] = data["description"];
    if (data["discountType"] !== undefined)
      body["discount_type"] = data["discountType"];
    if (data["discountValue"] !== undefined)
      body["discount_value"] = data["discountValue"];
    if (data["minOrderAmount"] !== undefined)
      body["min_order_amount_paisa"] = data["minOrderAmount"];
    if (data["maxDiscountAmount"] !== undefined)
      body["max_discount_paisa"] = data["maxDiscountAmount"];
    if (data["usageLimit"] !== undefined) body["max_uses"] = data["usageLimit"];
    if (data["isActive"] !== undefined) body["is_active"] = data["isActive"];
    if (data["validFrom"] !== undefined) body["valid_from"] = data["validFrom"];
    if (data["validUntil"] !== undefined)
      body["valid_until"] = data["validUntil"];

    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/coupons/${id}`, body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCoupon(res.data) };
  },

  async deactivateCoupon(id: string): Promise<ApiResponse<Coupon>> {
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/coupons/${id}/deactivate`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCoupon(res.data) };
  },

  // ── Campaigns ──────────────────────────────────────────────────────────────
  async getCampaigns(): Promise<ApiResponse<Campaign[]>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      error?: AnyRecord;
    }>("/api/admin/campaigns");
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: res.data.map(mapCampaign) };
  },

  async createCampaign(data: AnyRecord): Promise<ApiResponse<Campaign>> {
    const body = {
      name: data["name"],
      description: data["description"],
      banner_image_url: data["bannerImageUrl"] ?? data["banner_image_url"],
      discount_percentage: data["discountValue"] ?? data["discount_percentage"],
      is_active: data["isActive"] ?? data["is_active"] ?? false,
      starts_at: data["startDate"] ?? data["starts_at"],
      ends_at: data["endDate"] ?? data["ends_at"],
    };
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>("/api/admin/campaigns", body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCampaign(res.data) };
  },

  async updateCampaign(
    id: string,
    data: AnyRecord,
  ): Promise<ApiResponse<Campaign>> {
    const body: AnyRecord = {};
    if (data["name"] !== undefined) body["name"] = data["name"];
    if (data["description"] !== undefined)
      body["description"] = data["description"];
    if (data["bannerImageUrl"] !== undefined)
      body["banner_image_url"] = data["bannerImageUrl"];
    if (data["banner_image_url"] !== undefined)
      body["banner_image_url"] = data["banner_image_url"];
    if (data["discountValue"] !== undefined)
      body["discount_percentage"] = data["discountValue"];
    if (data["discount_percentage"] !== undefined)
      body["discount_percentage"] = data["discount_percentage"];
    if (data["isActive"] !== undefined) body["is_active"] = data["isActive"];
    if (data["startDate"] !== undefined) body["starts_at"] = data["startDate"];
    if (data["endDate"] !== undefined) body["ends_at"] = data["endDate"];

    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/campaigns/${id}`, body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCampaign(res.data) };
  },

  async toggleCampaign(id: string): Promise<ApiResponse<Campaign>> {
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/campaigns/${id}/toggle`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapCampaign(res.data) };
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  async getOrders(
    params: { page?: number; limit?: number; status?: string; q?: string } = {},
  ): Promise<ApiPaginatedResponse<OrderDetail>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);

    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord[];
      meta?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/orders?${qs}`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    return {
      success: true,
      data: res.data.map(mapOrderDetail),
      pagination: {
        page,
        limit,
        total: (res.meta?.["total"] as number) ?? 0,
        totalPages: (res.meta?.["totalPages"] as number) ?? 1,
      },
    };
  },

  async updateOrderStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<OrderDetail>> {
    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/orders/${id}/status`, { status });
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapOrderDetail(res.data) };
  },

  async updateOrderFulfillment(
    id: string,
    data: {
      fulfillmentStatus?: string;
      carrierName?: string;
      trackingId?: string;
    },
  ): Promise<ApiResponse<OrderDetail>> {
    const body: AnyRecord = {};
    if (data.fulfillmentStatus !== undefined)
      body["fulfillment_status"] = data.fulfillmentStatus;
    if (data.carrierName !== undefined) body["carrier_name"] = data.carrierName;
    if (data.trackingId !== undefined) body["tracking_id"] = data.trackingId;

    const res = await adminPatch<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/orders/${id}/fulfillment`, body);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapOrderDetail(res.data) };
  },

  async addOrderNote(
    id: string,
    note: string,
  ): Promise<ApiResponse<OrderDetail>> {
    const res = await adminPost<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/orders/${id}/notes`, { note });
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapOrderDetail(res.data) };
  },

  // Admin get single order
  async getOrderById(id: string): Promise<ApiResponse<OrderDetail>> {
    const res = await adminGet<{
      success: boolean;
      data?: AnyRecord;
      error?: AnyRecord;
    }>(`/api/admin/orders/${id}`);
    if (!res.success || !res.data)
      return {
        success: false,
        error: (res.error ?? { code: "UNKNOWN", message: "Failed" }) as {
          code: string;
          message: string;
        },
      };
    return { success: true, data: mapOrderDetail(res.data) };
  },
};
