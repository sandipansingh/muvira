import { delay } from './delay';
import { MockDatabase } from './store';
import type { ProductDetail } from '../types/product';
import type { Category } from '../types/category';
import type { Coupon } from '../types/coupon';
import type { Campaign } from '../types/campaign';
import type { OrderDetail, OrderStatus, FulfillmentStatus } from '../types/order';
import type { DashboardStats, InventoryItem } from '../types/dashboard';
import type { ApiResponse, ApiPaginatedResponse } from '../types/common';
import { slugify } from '../lib/slug';

const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Check if user is admin helper
const isAdmin = (): boolean => {
  const active = MockDatabase.getActiveUser();
  return active?.role === 'admin';
};

const forbiddenError = {
  success: false as const,
  error: { code: 'FORBIDDEN', message: 'Admin access required.' },
};

export const adminMockService = {
  // Dashboard & Stats
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    await delay(250);
    if (!isAdmin()) return forbiddenError;

    const orders = MockDatabase.getOrders();
    const products = MockDatabase.getProducts();
    const categories = MockDatabase.getCategories();
    const coupons = MockDatabase.getCoupons();

    const confirmedOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lowStockCount = products.filter((p) => p.stock <= 5).length;
    const activeCoupons = coupons.filter((c) => c.isActive).length;

    return {
      success: true,
      data: {
        totalOrders: orders.length,
        totalRevenue,
        totalProducts: products.length,
        totalCategories: categories.length,
        activeCoupons,
        lowStockCount,
      },
    };
  },

  // Inventory
  async getInventory(params: { lowStockOnly?: boolean; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<InventoryItem>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    let inventory: InventoryItem[] = products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      stock: p.stock,
      isLowStock: p.stock <= 5,
    }));

    if (params.lowStockOnly) {
      inventory = inventory.filter((item) => item.isLowStock);
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = inventory.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      success: true,
      data: inventory.slice(offset, offset + limit),
      pagination: { page, limit, total, totalPages },
    };
  },

  // Products CRUD
  async getProducts(params: { page?: number; limit?: number; q?: string; category?: string; isActive?: boolean } = {}): Promise<ApiPaginatedResponse<ProductDetail>> {
    await delay(200);
    if (!isAdmin()) return forbiddenError;

    let products = MockDatabase.getProducts();

    if (params.q) {
      const q = params.q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }

    if (params.category) {
      products = products.filter((p) => p.category.id === params.category);
    }

    if (params.isActive !== undefined) {
      products = products.filter((p) => p.isActive === params.isActive);
    }

    // Sort: newest first
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      success: true,
      data: products.slice(offset, offset + limit),
      pagination: { page, limit, total, totalPages },
    };
  },

  async createProduct(productData: any): Promise<ApiResponse<ProductDetail>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const categories = MockDatabase.getCategories();
    const cat = categories.find((c) => c.id === productData.categoryId || c.id === productData.category?.id);

    const price = productData.price;
    const salePrice = productData.salePrice;
    const discountPercent = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;

    const newProduct: ProductDetail = {
      ...productData,
      id: 'prod-' + uuid(),
      slug: slugify(productData.name),
      discountPercent,
      inStock: productData.stock > 0,
      category: {
        id: cat?.id || 'cat-custom',
        name: cat?.name || 'Uncategorized',
        slug: cat?.slug || 'uncategorized',
      },
      createdAt: new Date().toISOString(),
    } as any;

    MockDatabase.setProducts([newProduct, ...products]);
    return { success: true, data: newProduct };
  },

  async updateProduct(id: string, productData: any): Promise<ApiResponse<ProductDetail>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const idx = products.findIndex((p) => p.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    const existing = products[idx];
    const categories = MockDatabase.getCategories();

    let category = existing.category;
    if (productData.category?.id || productData.categoryId) {
      const catId = productData.category?.id || productData.categoryId;
      const cat = categories.find((c) => c.id === catId);
      if (cat) {
        category = { id: cat.id, name: cat.name, slug: cat.slug };
      }
    }

    const updatedPrice = productData.price !== undefined ? productData.price : existing.price;
    const updatedSalePrice = productData.salePrice !== undefined ? productData.salePrice : existing.salePrice;
    const discountPercent = updatedSalePrice ? Math.round(((updatedPrice - updatedSalePrice) / updatedPrice) * 100) : 0;
    const updatedStock = productData.stock !== undefined ? productData.stock : existing.stock;

    const updated: ProductDetail = {
      ...existing,
      ...productData,
      discountPercent,
      inStock: updatedStock > 0,
      category,
    } as any;

    // Regenerate slug if name changed
    if (productData.name) {
      updated.slug = slugify(productData.name);
    }

    products[idx] = updated;
    MockDatabase.setProducts([...products]);

    return { success: true, data: updated };
  },

  async deleteProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const idx = products.findIndex((p) => p.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    // Soft delete: set isActive to false
    products[idx].isActive = false;
    MockDatabase.setProducts([...products]);

    return { success: true, data: { deleted: true } };
  },

  async uploadProductImages(id: string, imageUrls: string[]): Promise<ApiResponse<ProductDetail['images']>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const idx = products.findIndex((p) => p.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    const currentImages = products[idx].images;
    const newImages = imageUrls.map((url, i) => ({
      id: 'img-' + uuid(),
      url,
      altText: 'Uploaded image',
      isPrimary: currentImages.length === 0 && i === 0,
      sortOrder: currentImages.length + i,
    }));

    const updatedImages = [...currentImages, ...newImages];
    products[idx].images = updatedImages;
    MockDatabase.setProducts([...products]);

    return { success: true, data: newImages };
  },

  async deleteProductImage(productId: string, imageId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const idx = products.findIndex((p) => p.id === productId);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    const filtered = products[idx].images.filter((img) => img.id !== imageId);
    
    // If we deleted the primary, assign first remaining as primary
    if (products[idx].images.find((img) => img.id === imageId)?.isPrimary && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }

    products[idx].images = filtered;
    MockDatabase.setProducts([...products]);

    return { success: true, data: { deleted: true } };
  },

  async reorderProductImages(productId: string, imageOrder: string[]): Promise<ApiResponse<ProductDetail['images']>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const idx = products.findIndex((p) => p.id === productId);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } };
    }

    const currentImages = products[idx].images;
    const reordered = imageOrder
      .map((imgId, idx) => {
        const img = currentImages.find((i) => i.id === imgId);
        if (img) {
          return { ...img, sortOrder: idx, isPrimary: idx === 0 };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    products[idx].images = reordered;
    MockDatabase.setProducts([...products]);

    return { success: true, data: reordered };
  },

  // Categories CRUD
  async getCategoriesList(): Promise<ApiResponse<Category[]>> {
    await delay(100);
    if (!isAdmin()) return forbiddenError;
    return { success: true, data: MockDatabase.getCategories() };
  },

  async createCategory(categoryData: Omit<Category, 'id' | 'slug'>): Promise<ApiResponse<Category>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const categories = MockDatabase.getCategories();
    const newCategory: Category = {
      ...categoryData,
      id: 'cat-' + uuid(),
      slug: slugify(categoryData.name),
      isActive: categoryData.isActive ?? true,
    };

    MockDatabase.setCategories([...categories, newCategory]);
    return { success: true, data: newCategory };
  },

  async updateCategory(id: string, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const categories = MockDatabase.getCategories();
    const idx = categories.findIndex((c) => c.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Category not found.' } };
    }

    const updated: Category = {
      ...categories[idx],
      ...categoryData,
    };

    if (categoryData.name) {
      updated.slug = slugify(categoryData.name);
    }

    categories[idx] = updated;
    MockDatabase.setCategories([...categories]);

    // Update references in products
    const products = MockDatabase.getProducts();
    const updatedProducts = products.map((p) => {
      if (p.category.id === id) {
        return {
          ...p,
          category: {
            id,
            name: updated.name,
            slug: updated.slug,
          },
        };
      }
      return p;
    });
    MockDatabase.setProducts(updatedProducts);

    return { success: true, data: updated };
  },

  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const products = MockDatabase.getProducts();
    const inUse = products.some((p) => p.category.id === id && p.isActive);

    if (inUse) {
      return {
        success: false,
        error: {
          code: 'CATEGORY_HAS_PRODUCTS',
          message: "Cannot delete this category because it still contains active products.",
        },
      };
    }

    const categories = MockDatabase.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    MockDatabase.setCategories(filtered);

    return { success: true, data: { deleted: true } };
  },

  // Coupons CRUD
  async getCoupons(): Promise<ApiResponse<Coupon[]>> {
    await delay(150);
    if (!isAdmin()) return forbiddenError;
    return { success: true, data: MockDatabase.getCoupons() };
  },

  async createCoupon(couponData: Omit<Coupon, 'id' | 'isActive'>): Promise<ApiResponse<Coupon>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const coupons = MockDatabase.getCoupons();
    const exists = coupons.some((c) => c.code.toUpperCase() === couponData.code.trim().toUpperCase());

    if (exists) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_CODE',
          message: 'A coupon with this code already exists.',
        },
      };
    }

    const newCoupon: Coupon = {
      ...couponData,
      id: 'coup-' + uuid(),
      code: couponData.code.trim().toUpperCase(),
      isActive: true,
    };

    MockDatabase.setCoupons([...coupons, newCoupon]);
    return { success: true, data: newCoupon };
  },

  async updateCoupon(id: string, couponData: Partial<Coupon>): Promise<ApiResponse<Coupon>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const coupons = MockDatabase.getCoupons();
    const idx = coupons.findIndex((c) => c.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found.' } };
    }

    const updated: Coupon = {
      ...coupons[idx],
      ...couponData,
    };

    if (couponData.code) {
      updated.code = couponData.code.trim().toUpperCase();
    }

    coupons[idx] = updated;
    MockDatabase.setCoupons([...coupons]);

    return { success: true, data: updated };
  },

  async deactivateCoupon(id: string): Promise<ApiResponse<Coupon>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const coupons = MockDatabase.getCoupons();
    const idx = coupons.findIndex((c) => c.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found.' } };
    }

    coupons[idx].isActive = false;
    MockDatabase.setCoupons([...coupons]);

    return { success: true, data: coupons[idx] };
  },

  // Campaigns CRUD
  async getCampaigns(): Promise<ApiResponse<Campaign[]>> {
    await delay(150);
    if (!isAdmin()) return forbiddenError;
    return { success: true, data: MockDatabase.getCampaigns() };
  },

  async createCampaign(campaignData: Omit<Campaign, 'id' | 'slug' | 'isActive'>): Promise<ApiResponse<Campaign>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const campaigns = MockDatabase.getCampaigns();
    const newCampaign: Campaign = {
      ...campaignData,
      id: 'camp-' + uuid(),
      slug: slugify(campaignData.name),
      isActive: true,
    };

    MockDatabase.setCampaigns([...campaigns, newCampaign]);
    return { success: true, data: newCampaign };
  },

  async updateCampaign(id: string, campaignData: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const campaigns = MockDatabase.getCampaigns();
    const idx = campaigns.findIndex((c) => c.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found.' } };
    }

    const updated: Campaign = {
      ...campaigns[idx],
      ...campaignData,
    };

    if (campaignData.name) {
      updated.slug = slugify(campaignData.name);
    }

    campaigns[idx] = updated;
    MockDatabase.setCampaigns([...campaigns]);

    return { success: true, data: updated };
  },

  async toggleCampaign(id: string): Promise<ApiResponse<Campaign>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const campaigns = MockDatabase.getCampaigns();
    const idx = campaigns.findIndex((c) => c.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found.' } };
    }

    campaigns[idx].isActive = !campaigns[idx].isActive;
    MockDatabase.setCampaigns([...campaigns]);

    return { success: true, data: campaigns[idx] };
  },

  // Orders Admin Management
  async getOrders(params: { page?: number; limit?: number; status?: OrderStatus; paymentStatus?: string; fulfillmentStatus?: string; q?: string } = {}): Promise<ApiPaginatedResponse<OrderDetail>> {
    await delay(250);
    if (!isAdmin()) return forbiddenError;

    let orders = MockDatabase.getOrders();

    if (params.status) {
      orders = orders.filter((o) => o.status === params.status);
    }
    if (params.paymentStatus) {
      orders = orders.filter((o) => o.paymentStatus === params.paymentStatus);
    }
    if (params.fulfillmentStatus) {
      orders = orders.filter((o) => o.fulfillmentStatus === params.fulfillmentStatus);
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer?.fullName.toLowerCase().includes(q) ||
          o.customer?.phone.toLowerCase().includes(q)
      );
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      success: true,
      data: orders.slice(offset, offset + limit),
      pagination: { page, limit, total, totalPages },
    };
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResponse<OrderDetail>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const orders = MockDatabase.getOrders();
    const idx = orders.findIndex((o) => o.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } };
    }

    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();
    MockDatabase.setOrders([...orders]);

    return { success: true, data: orders[idx] };
  },

  async updateOrderFulfillment(id: string, data: { fulfillmentStatus: FulfillmentStatus; carrierName: string; trackingId: string }): Promise<ApiResponse<OrderDetail>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const orders = MockDatabase.getOrders();
    const idx = orders.findIndex((o) => o.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } };
    }

    orders[idx].fulfillmentStatus = data.fulfillmentStatus;
    orders[idx].carrierName = data.carrierName || null;
    orders[idx].trackingId = data.trackingId || null;
    orders[idx].updatedAt = new Date().toISOString();
    MockDatabase.setOrders([...orders]);

    return { success: true, data: orders[idx] };
  },

  async addOrderNote(id: string, note: string): Promise<ApiResponse<OrderDetail['adminNotes']>> {
    await delay();
    if (!isAdmin()) return forbiddenError;

    const orders = MockDatabase.getOrders();
    const idx = orders.findIndex((o) => o.id === id);

    if (idx === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } };
    }

    const currentNotes = orders[idx].adminNotes || [];
    const newNote = {
      id: 'note-' + uuid(),
      note,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin User',
    };

    orders[idx].adminNotes = [...currentNotes, newNote];
    orders[idx].updatedAt = new Date().toISOString();
    MockDatabase.setOrders([...orders]);

    return { success: true, data: orders[idx].adminNotes };
  },
};
