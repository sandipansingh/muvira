import { delay } from './delay';
import { MockDatabase } from './store';
import type { Category } from '../types/category';
import type { ApiResponse } from '../types/common';

export const categoriesMockService = {
  async getCategories(): Promise<ApiResponse<Category[]>> {
    await delay(150);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const categories = MockDatabase.getCategories().filter((c) => c.isActive !== false);
    // Sort by sortOrder
    categories.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      success: true,
      data: categories,
    };
  },

  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const categories = MockDatabase.getCategories();
    const category = categories.find((c) => c.slug === slug && c.isActive !== false);

    if (!category) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found.' },
      };
    }

    return {
      success: true,
      data: category,
    };
  },
};
