import { delay } from './delay';
import { MockDatabase } from './store';
import type { ProductDetail, ProductListItem, ProductQueryParams } from '../types/product';
import type { ApiPaginatedResponse, ApiResponse } from '../types/common';

const mapToListItem = (p: ProductDetail): ProductListItem => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  shortDescription: p.shortDescription,
  price: p.price,
  salePrice: p.salePrice,
  discountPercent: p.discountPercent,
  stock: p.stock,
  inStock: p.inStock,
  isFeatured: p.isFeatured,
  categoryId: p.category.id,
  categoryName: p.category.name,
  primaryImageUrl: p.images.find((img) => img.isPrimary)?.url || p.images[0]?.url || '',
  createdAt: p.createdAt,
});

export const productsMockService = {
  async getProducts(params: ProductQueryParams = {}): Promise<ApiPaginatedResponse<ProductListItem>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    let products = MockDatabase.getProducts().filter((p) => p.isActive);

    // Apply category filter
    if (params.category) {
      products = products.filter(
        (p) => p.category.slug.toLowerCase() === params.category?.toLowerCase()
      );
    }

    // Apply full-text search
    if (params.q) {
      const q = params.q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    // Apply price filters
    if (params.minPrice !== undefined) {
      products = products.filter((p) => (p.salePrice ?? p.price) >= (params.minPrice || 0));
    }
    if (params.maxPrice !== undefined) {
      products = products.filter((p) => (p.salePrice ?? p.price) <= (params.maxPrice || Infinity));
    }

    // Apply stock filter
    if (params.inStock) {
      products = products.filter((p) => p.inStock && p.stock > 0);
    }

    // Apply sorting
    if (params.sort) {
      switch (params.sort) {
        case 'price_asc':
          products.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
          break;
        case 'price_desc':
          products.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'popularity':
          // Default mock behavior is featured first
          products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
          break;
      }
    }

    // Paginate results
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = products.slice(offset, offset + limit).map(mapToListItem);

    return {
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async getProductBySlug(slug: string): Promise<ApiResponse<ProductDetail>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const products = MockDatabase.getProducts();
    const product = products.find((p) => p.slug === slug && p.isActive);

    if (!product) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found.' },
      };
    }

    return {
      success: true,
      data: product,
    };
  },

  async getRelatedProducts(productId: string): Promise<ApiResponse<ProductListItem[]>> {
    await delay(150);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const products = MockDatabase.getProducts().filter((p) => p.isActive);
    const target = products.find((p) => p.id === productId);

    if (!target) {
      return {
        success: true,
        data: [],
      };
    }

    const related = products
      .filter((p) => p.category.id === target.category.id && p.id !== productId)
      .slice(0, 8)
      .map(mapToListItem);

    return {
      success: true,
      data: related,
    };
  },
};
