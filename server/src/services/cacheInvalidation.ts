import { deleteCache, deleteCacheByPattern } from '../config/cache'
import { logger } from '../lib/logger'

export type CacheInvalidationEvent =
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_DELETED'
  | 'ORDER_PLACED'
  | 'ORDER_UPDATED'
  | 'REVIEW_ADDED'
  | 'REVIEW_DELETED'
  | 'CART_UPDATED'
  | 'CATEGORY_UPDATED'

export interface ProductEventPayload {
  id: string
  categorySlug?: string
}

export interface OrderEventPayload {
  id: string
  userId: string

  productIds?: string[]
}

export interface ReviewEventPayload {
  productId: string
}

export interface CartEventPayload {
  userId: string
}

export interface CategoryEventPayload {
  slug: string
}

export type InvalidationPayload =
  | ProductEventPayload
  | OrderEventPayload
  | ReviewEventPayload
  | CartEventPayload
  | CategoryEventPayload

export function invalidateOn(event: CacheInvalidationEvent, payload: InvalidationPayload): void {
  try {
    logger.debug({ event, payload }, '[CACHE_INVALIDATION] Processing event')

    switch (event) {
      case 'PRODUCT_UPDATED':
      case 'PRODUCT_CREATED':
      case 'PRODUCT_DELETED': {
        deleteCacheByPattern('GET:/api/products')
        break
      }

      case 'ORDER_PLACED': {
        const p = payload as OrderEventPayload
        const keys: string[] = [`cart:user:${p.userId}`, `orders:user:${p.userId}`]
        // Evict inventory for every product that was ordered
        if (p.productIds) {
          p.productIds.forEach((pid) => {
            keys.push(`inventory:product:${pid}`)
          })
        }
        deleteCache(keys)
        break
      }

      case 'ORDER_UPDATED': {
        const p = payload as OrderEventPayload
        deleteCache([`orders:id:${p.id}`, `orders:user:${p.userId}`])
        break
      }

      case 'REVIEW_ADDED':
      case 'REVIEW_DELETED': {
        const p = payload as ReviewEventPayload
        deleteCache(`reviews:product:${p.productId}`)
        deleteCacheByPattern('GET:/api/products') // ensure list/detail aggregates refresh
        break
      }

      case 'CART_UPDATED': {
        const p = payload as CartEventPayload
        deleteCache(`cart:user:${p.userId}`)
        break
      }

      case 'CATEGORY_UPDATED': {
        const p = payload as CategoryEventPayload
        deleteCache(['GET:/api/categories'])
        deleteCacheByPattern(`GET:/api/categories/${p.slug}`)
        deleteCacheByPattern('GET:/api/products')
        break
      }

      default: {
        // Exhaustiveness check - TypeScript will warn if a new event is added
        // to the union without a corresponding case.
        const _exhaustive: never = event
        logger.warn(
          { event: _exhaustive },
          '[CACHE_INVALIDATION] Unknown event - no keys invalidated'
        )
      }
    }

    logger.debug({ event }, '[CACHE_INVALIDATION] Done')
  } catch (err) {
    // Invalidation errors must NEVER crash the request
    logger.error(
      { err, event },
      '[CACHE_INVALIDATION] Error during invalidation - cache may be stale'
    )
  }
}
