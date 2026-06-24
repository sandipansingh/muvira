/**
 * products/routes.ts
 *
 * Public routes:
 *   GET /api/products        → list with optional filter/search (cached 5 min)
 *   GET /api/products/:slug  → single product by slug (cached 10 min)
 *   GET /api/products/:id/related → related products (cached 5 min)
 *
 * Admin routes (mounted under /api/admin/products by app.ts,
 * requireAuth + requireAdmin guards are applied by the parent admin router):
 *   GET    /                  → admin product list (NOT cached — admins see live data)
 *   POST   /                  → create product  → invalidates PRODUCT_CREATED
 *   PATCH  /:id               → update product  → invalidates PRODUCT_UPDATED
 *   DELETE /:id               → delete product  → invalidates PRODUCT_DELETED
 *   POST   /:id/images        → add image       → invalidates PRODUCT_UPDATED
 *   DELETE /:id/images/:imageId → remove image  → invalidates PRODUCT_UPDATED
 *
 * Cache design notes:
 *   - `cacheMiddleware(ttl)` is applied only to public GET routes.
 *   - Admin routes explicitly skip caching (they require auth, which
 *     `cacheMiddleware` already skips automatically, but we make it
 *     explicit here by NOT applying the middleware at all on admin routes).
 *   - Mutation routes call `invalidateOn` AFTER the successful DB write
 *     so the cache never holds stale data for longer than a single request.
 */

import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { cacheMiddleware } from "../../middleware/cacheMiddleware";
import {
  ListProductsQuerySchema,
  ProductParamsSchema,
  ProductIdParamsSchema,
  CreateProductSchema,
  UpdateProductSchema,
  AddProductImageSchema,
} from "./schema";
import * as controller from "./controller";

// ─── Public Routes ────────────────────────────────────────────────────────────

export const productsRouter = Router();

/**
 * GET /api/products
 *
 * Lists active products.  Supports filtering by category, price range,
 * stock status, and free-text search.
 *
 * Cache: 5 min (300 s)
 * Key:   Derived from full URL including query string.
 *        e.g. "GET:/api/products?category=men&sort=newest&page=1"
 *
 * Note: When `q` (search) or `category` params are present the middleware
 *       still generates a stable key from the full URL so different search
 *       queries are cached independently.
 */
productsRouter.get(
  "/",
  cacheMiddleware(300),                          // 5 min
  validate({ query: ListProductsQuerySchema }),
  controller.listProducts,
);

/**
 * GET /api/products/:slug
 *
 * Retrieves a single product by URL slug.
 *
 * Cache: 10 min (600 s)
 * Key:   "GET:/api/products/<slug>"
 */
productsRouter.get(
  "/:slug",
  cacheMiddleware(600),                          // 10 min
  validate({ params: ProductParamsSchema }),
  controller.getProduct,
);

/**
 * GET /api/products/:id/related
 *
 * Returns sibling products in the same category (max 8).
 *
 * Cache: 5 min (300 s)
 * Key:   "GET:/api/products/<id>/related"
 */
productsRouter.get(
  "/:id/related",
  cacheMiddleware(300),                          // 5 min
  validate({ params: ProductIdParamsSchema }),
  controller.getRelatedProducts,
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export const adminProductsRouter = Router();

/**
 * GET /api/admin/products
 *
 * Admin product list — includes inactive products.
 * NOT cached: admins need live data at all times.
 */
adminProductsRouter.get(
  "/",
  validate({ query: ListProductsQuerySchema }),
  controller.adminListProducts,
);

/**
 * POST /api/admin/products
 *
 * Creates a new product.
 * Triggers PRODUCT_CREATED cache invalidation after success.
 */
adminProductsRouter.post(
  "/",
  validate({ body: CreateProductSchema }),
  controller.adminCreateProduct,
);

/**
 * PATCH /api/admin/products/:id
 *
 * Updates an existing product.
 * Triggers PRODUCT_UPDATED cache invalidation after success.
 */
adminProductsRouter.patch(
  "/:id",
  validate({ params: ProductIdParamsSchema, body: UpdateProductSchema }),
  controller.adminUpdateProduct,
);

/**
 * DELETE /api/admin/products/:id
 *
 * Soft-deletes a product (sets is_active = false).
 * Triggers PRODUCT_DELETED cache invalidation after success.
 */
adminProductsRouter.delete(
  "/:id",
  validate({ params: ProductIdParamsSchema }),
  controller.adminDeleteProduct,
);

/**
 * POST /api/admin/products/:id/images
 *
 * Adds an image to an existing product.
 * Triggers PRODUCT_UPDATED cache invalidation (product detail changes).
 */
adminProductsRouter.post(
  "/:id/images",
  validate({ params: ProductIdParamsSchema, body: AddProductImageSchema }),
  controller.adminAddProductImage,
);

/**
 * DELETE /api/admin/products/:id/images/:imageId
 *
 * Removes an image from a product.
 * Triggers PRODUCT_UPDATED cache invalidation.
 */
adminProductsRouter.delete(
  "/:id/images/:imageId",
  validate({
    params: z.object({ id: z.string().uuid(), imageId: z.string().uuid() }),
  }),
  controller.adminDeleteProductImage,
);
