import type { ProductReview } from '../types/product'

export function mergeReviewPage(
  current: ProductReview[],
  incoming: ProductReview[],
  page: number
): ProductReview[] {
  if (page === 1) return incoming

  const existingIds = new Set(current.map((review) => review.id))
  return [...current, ...incoming.filter((review) => !existingIds.has(review.id))]
}

export function reviewDisplayState(reviews: ProductReview[], error?: string | null) {
  if (error && reviews.length === 0) return 'error' as const
  if (reviews.length === 0) return 'empty' as const
  if (error) return 'partial-error' as const
  return 'ready' as const
}
