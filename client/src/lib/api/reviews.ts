import { api } from './client'
import { mapProductReview } from './adapters'
import type { ProductReview, ReviewSummary } from '../../types/product'
import type { ApiResponse, ApiPaginatedResponse } from '../../types/common'

interface RawReview {
  id: string
  product_id?: string
  productId?: string
  user_id?: string
  userId?: string
  rating: number
  comment: string | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  user_name?: string | null
  userName?: string | null
  profiles?: { full_name?: string | null }
}

interface ReviewsListResponse {
  reviews: RawReview[]
  summary: ReviewSummary
}

export const reviewsApiService = {
  async getProductReviews(
    productId: string,
    page = 1,
    limit = 20
  ): Promise<ApiPaginatedResponse<ProductReview> & { summary: ReviewSummary }> {
    const res = await api.get<{
      success: boolean
      data?: ReviewsListResponse
      meta?: { page: number; limit: number; total: number; totalPages: number }
      error?: { code: string; message: string }
    }>(`/api/products/${encodeURIComponent(productId)}/reviews?page=${page}&limit=${limit}`)

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'UNKNOWN', message: 'Failed to fetch reviews' },
        summary: { avgRating: null, totalReviews: 0 },
      } as any
    }

    const rawReviews = (res.data.reviews ?? []) as unknown as Record<string, unknown>[]
    return {
      success: true,
      data: rawReviews.map(mapProductReview),
      summary: res.data.summary ?? { avgRating: null, totalReviews: 0 },
      pagination: {
        page: res.meta?.page ?? page,
        limit: res.meta?.limit ?? limit,
        total: res.meta?.total ?? 0,
        totalPages: res.meta?.totalPages ?? 1,
      },
    }
  },

  async submitReview(
    productId: string,
    rating: number,
    comment?: string | null
  ): Promise<ApiResponse<{ review: ProductReview; summary: ReviewSummary }>> {
    const res = await api.post<{
      success: boolean
      data?: { review: RawReview; summary: ReviewSummary }
      error?: { code: string; message: string }
    }>(
      `/api/products/${encodeURIComponent(productId)}/reviews`,
      { rating, comment: comment ?? null },
      true
    )

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error ?? { code: 'UNKNOWN', message: 'Failed to submit review' },
      }
    }

    return {
      success: true,
      data: {
        review: mapProductReview(res.data.review as unknown as Record<string, unknown>),
        summary: res.data.summary,
      },
    }
  },
}
