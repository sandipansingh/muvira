import { api } from './client';
import { mapCategory } from './adapters';
import type { Category } from '../../types/category';
import type { ApiResponse } from '../../types/common';

export const categoriesApiService = {
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const res = await api.get<{
      success: boolean;
      data?: Record<string, unknown>[];
      error?: { code: string; message: string };
    }>('/api/categories');

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch categories' } };
    }

    return { success: true, data: res.data.map(mapCategory) };
  },

  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    const res = await api.get<{
      success: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    }>(`/api/categories/${encodeURIComponent(slug)}`);

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? { code: 'NOT_FOUND', message: 'Category not found' } };
    }

    return { success: true, data: mapCategory(res.data) };
  },
};
