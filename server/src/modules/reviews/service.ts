import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { ProductReview } from '../../types'
import type { ProductReviewsQuery, CreateReviewInput, AdminReviewsQuery } from './schema'
import { invalidateOn } from '../../services/cacheInvalidation'

// Check that the user has at least one delivered + paid order containing this product
async function hasDeliveredOrderForProduct(userId: string, productId: string): Promise<boolean> {
  const { count, error } = await adminSupabase
    .from('order_items')
    .select(
      `
      id,
      orders!inner (
        user_id,
        status,
        payment_status
      )
    `,
      { count: 'exact', head: true }
    )
    .eq('product_id', productId)
    .eq('orders.user_id', userId)
    .eq('orders.status', 'delivered')
    .eq('orders.payment_status', 'paid')

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to verify purchase eligibility')
  }

  return (count ?? 0) > 0
}

// Public: list reviews for a product + summary aggregates
export async function listProductReviews(
  productId: string,
  query: ProductReviewsQuery
): Promise<{
  reviews: (ProductReview & { user_name?: string | null })[]
  summary: { avgRating: number | null; totalReviews: number }
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit } = query
  const offset = (page - 1) * limit

  // Fetch reviews + profile name via join
  const { data, error, count } = await adminSupabase
    .from('product_reviews')
    .select(
      `
      *,
      profiles ( full_name )
    `,
      { count: 'exact' }
    )
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch reviews')
  }

  type ReviewWithProfile = ProductReview & {
    profiles?: { full_name: string | null } | { full_name: string | null }[] | null
  }

  const reviews = ((data as unknown as ReviewWithProfile[]) ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return {
      id: r.id,
      product_id: r.product_id,
      user_id: r.user_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user_name: profile?.full_name ?? null,
    }
  }) as (ProductReview & { user_name?: string | null })[]

  const aggregate = (await getReviewAggregates([productId]))[productId] ?? {
    rating: null,
    reviewCount: 0,
  }

  return {
    reviews,
    summary: { avgRating: aggregate.rating, totalReviews: aggregate.reviewCount },
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// Get the current user's review for this product (if any)
export async function getUserReviewForProduct(
  userId: string,
  productId: string
): Promise<ProductReview | null> {
  const { data, error } = await adminSupabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch user review')
  return (data as ProductReview) ?? null
}

// Authenticated: create or update review (only if verified buyer)
export async function createOrUpdateReview(
  productId: string,
  userId: string,
  input: CreateReviewInput
): Promise<ProductReview> {
  const isVerified = await hasDeliveredOrderForProduct(userId, productId)
  if (!isVerified) {
    throw new AppError(
      403,
      'NOT_VERIFIED_BUYER',
      'You can only review products after your order has been delivered.'
    )
  }

  const payload = {
    product_id: productId,
    user_id: userId,
    rating: input.rating,
    comment: input.comment ?? null,
  }

  // Upsert using unique constraint (product_id + user_id)
  const { data, error } = await adminSupabase
    .from('product_reviews')
    .upsert(payload, { onConflict: 'product_id,user_id' })
    .select()
    .single()

  if (error || !data) {
    throw new AppError(500, 'DB_ERROR', 'Failed to save review')
  }

  // Invalidate any cached product review data
  invalidateOn('REVIEW_ADDED', { productId })

  return data as ProductReview
}

// Admin list (with filters)
export async function adminListReviews(query: AdminReviewsQuery): Promise<{
  reviews: Record<string, unknown>[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit, productId, rating, q } = query
  const offset = (page - 1) * limit

  let dbQuery = adminSupabase
    .from('product_reviews')
    .select(
      `
      id,
      product_id,
      user_id,
      rating,
      comment,
      created_at,
      updated_at,
      products ( id, name, slug ),
      profiles ( id, full_name, email )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (productId) dbQuery = dbQuery.eq('product_id', productId)
  if (rating) dbQuery = dbQuery.eq('rating', rating)

  if (q) {
    // Search comment or product name (ilike on joined not directly supported, do broad ilike)
    dbQuery = dbQuery.ilike('comment', `%${q}%`)
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch reviews')

  type AdminReviewRow = ProductReview & {
    products?: { name: string; slug: string } | { name: string; slug: string }[] | null
    profiles?:
      | { full_name: string | null; email: string | null }
      | { full_name: string | null; email: string | null }[]
      | null
  }

  // Flatten joined data for frontend convenience
  const reviews = ((data as unknown as AdminReviewRow[]) ?? []).map((r) => {
    const product = Array.isArray(r.products) ? r.products[0] : r.products
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return {
      id: r.id,
      productId: r.product_id,
      productName: product?.name ?? '',
      productSlug: product?.slug ?? '',
      userId: r.user_id,
      userName: profile?.full_name ?? '',
      userEmail: profile?.email ?? '',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  })

  return {
    reviews,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// Admin delete
export async function adminDeleteReview(id: string): Promise<void> {
  // Fetch productId before delete for cache invalidation
  const { data: existing } = await adminSupabase
    .from('product_reviews')
    .select('product_id')
    .eq('id', id)
    .single()

  const { error } = await adminSupabase.from('product_reviews').delete().eq('id', id)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to delete review')

  if (existing?.product_id) {
    invalidateOn('REVIEW_DELETED', { productId: existing.product_id })
  }
}

// Batch aggregates helper (used by products service)
export async function getReviewAggregates(
  productIds: string[]
): Promise<Record<string, { rating: number | null; reviewCount: number }>> {
  if (productIds.length === 0) return {}

  const { data, error } = await adminSupabase.rpc('get_product_review_summaries', {
    p_product_ids: productIds,
  })

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch product review summaries')
  }

  const result: Record<string, { rating: number | null; reviewCount: number }> = {}
  for (const pid of productIds) {
    result[pid] = { rating: null, reviewCount: 0 }
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const productId = row['product_id'] as string
    result[productId] = {
      rating: row['rating'] == null ? null : Number(row['rating']),
      reviewCount: Number(row['review_count'] ?? 0),
    }
  }

  return result
}
