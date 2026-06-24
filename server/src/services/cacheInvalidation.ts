/**
 * cacheInvalidation.ts — Event-driven cache invalidation service.
 *
 * Purpose:
 *   Provides a single `invalidateOn(event, payload)` function that route
 *   controllers call after any mutation.  The function maps domain events
 *   to the exact set of cache keys (or key prefixes) that must be evicted,
 *   then delegates to `deleteCache` / `deleteCacheByPattern`.
 *
 * Design:
 *   Using named events (string literals) rather than direct key deletions
 *   keeps invalidation logic decoupled from individual controllers.  When a
 *   cache key naming convention changes, only this file needs updating.
 *
 * Key naming conventions used (must stay in sync with cacheMiddleware.ts
 * and the CACHE_KEYS constants defined below):
 *
 *   products:all                   — full product list (no filters)
 *   products:id:<id>               — single product by ID
 *   products:category:<slug>       — products filtered by category
 *   products:search:<hash>         — search / filter result page
 *   cart:user:<userId>             — shopping cart
 *   orders:user:<userId>           — order list for a user
 *   orders:id:<orderId>            — single order detail
 *   reviews:product:<productId>    — product reviews
 *   inventory:product:<productId>  — stock levels
 *   categories:all                 — full category list
 *
 * Failure policy:
 *   deleteCache / deleteCacheByPattern never throw.  A cache error during
 *   invalidation is logged but the request continues normally.
 *
 * Usage:
 *   import { invalidateOn } from "../services/cacheInvalidation";
 *
 *   // After updating a product:
 *   await invalidateOn("PRODUCT_UPDATED", {
 *     id: "uuid",
 *     categorySlug: "furniture",
 *   });
 */

import { deleteCache, deleteCacheByPattern } from "../config/cache";
import { logger } from "../lib/logger";

// ─── Supported Domain Events ─────────────────────────────────────────────────

export type CacheInvalidationEvent =
  | "PRODUCT_UPDATED"
  | "PRODUCT_CREATED"
  | "PRODUCT_DELETED"
  | "ORDER_PLACED"
  | "ORDER_UPDATED"
  | "REVIEW_ADDED"
  | "CART_UPDATED"
  | "CATEGORY_UPDATED";

// ─── Event Payload Types ──────────────────────────────────────────────────────

export interface ProductEventPayload {
  id: string;
  categorySlug?: string;
}

export interface OrderEventPayload {
  id: string;
  userId: string;
  /** Product IDs whose inventory may have changed (used for ORDER_PLACED). */
  productIds?: string[];
}

export interface ReviewEventPayload {
  productId: string;
}

export interface CartEventPayload {
  userId: string;
}

export interface CategoryEventPayload {
  slug: string;
}

export type InvalidationPayload =
  | ProductEventPayload
  | OrderEventPayload
  | ReviewEventPayload
  | CartEventPayload
  | CategoryEventPayload;

// ─── Invalidation Map ─────────────────────────────────────────────────────────

/**
 * invalidateOn — Evict all cache keys affected by a domain event.
 *
 * @param event   - One of the supported `CacheInvalidationEvent` strings.
 * @param payload - Event-specific data needed to build the affected key list.
 *
 * Every branch only deletes the minimal set of keys required — nothing more.
 * Pattern-based deletion (prefix sweep) is used where a variable suffix makes
 * exact key enumeration impractical (e.g. all search hashes).
 */
export function invalidateOn(
  event: CacheInvalidationEvent,
  payload: InvalidationPayload,
): void {
  try {
    logger.debug({ event, payload }, "[CACHE_INVALIDATION] Processing event");

    switch (event) {
      // ── Product mutations ────────────────────────────────────────────────
      case "PRODUCT_UPDATED": {
        const p = payload as ProductEventPayload;
        const keys: string[] = [
          `products:all`,
          `products:id:${p.id}`,
        ];
        if (p.categorySlug) {
          keys.push(`products:category:${p.categorySlug}`);
        }
        deleteCache(keys);
        // Invalidate any search results that may contain this product
        deleteCacheByPattern("products:search:");
        break;
      }

      case "PRODUCT_CREATED": {
        const p = payload as ProductEventPayload;
        const keys: string[] = ["products:all"];
        if (p.categorySlug) {
          keys.push(`products:category:${p.categorySlug}`);
        }
        deleteCache(keys);
        // New product may appear in search results
        deleteCacheByPattern("products:search:");
        break;
      }

      case "PRODUCT_DELETED": {
        const p = payload as ProductEventPayload;
        const keys: string[] = [
          "products:all",
          `products:id:${p.id}`,
          `inventory:product:${p.id}`,
        ];
        if (p.categorySlug) {
          keys.push(`products:category:${p.categorySlug}`);
        }
        deleteCache(keys);
        deleteCacheByPattern("products:search:");
        break;
      }

      // ── Order events ─────────────────────────────────────────────────────
      case "ORDER_PLACED": {
        const p = payload as OrderEventPayload;
        const keys: string[] = [
          `cart:user:${p.userId}`,
          `orders:user:${p.userId}`,
        ];
        // Evict inventory for every product that was ordered
        if (p.productIds) {
          p.productIds.forEach((pid) => {
            keys.push(`inventory:product:${pid}`);
          });
        }
        deleteCache(keys);
        break;
      }

      case "ORDER_UPDATED": {
        const p = payload as OrderEventPayload;
        deleteCache([
          `orders:id:${p.id}`,
          `orders:user:${p.userId}`,
        ]);
        break;
      }

      // ── Review events ────────────────────────────────────────────────────
      case "REVIEW_ADDED": {
        const p = payload as ReviewEventPayload;
        deleteCache(`reviews:product:${p.productId}`);
        break;
      }

      // ── Cart events ──────────────────────────────────────────────────────
      case "CART_UPDATED": {
        const p = payload as CartEventPayload;
        deleteCache(`cart:user:${p.userId}`);
        break;
      }

      // ── Category events ──────────────────────────────────────────────────
      case "CATEGORY_UPDATED": {
        const p = payload as CategoryEventPayload;
        deleteCache([
          "categories:all",
          `products:category:${p.slug}`,
        ]);
        break;
      }

      default: {
        // Exhaustiveness check — TypeScript will warn if a new event is added
        // to the union without a corresponding case.
        const _exhaustive: never = event;
        logger.warn({ event: _exhaustive }, "[CACHE_INVALIDATION] Unknown event — no keys invalidated");
      }
    }

    logger.debug({ event }, "[CACHE_INVALIDATION] Done");
  } catch (err) {
    // Invalidation errors must NEVER crash the request
    logger.error({ err, event }, "[CACHE_INVALIDATION] Error during invalidation — cache may be stale");
  }
}
