/**
 * products/controller.ts
 *
 * Express request handlers for the products module.
 *
 * Cache invalidation strategy:
 *   - Public GET handlers are cached by `cacheMiddleware` in routes.ts.
 *     The controller itself does NOT touch the cache directly for reads.
 *   - Admin mutation handlers (create / update / delete) call `invalidateOn`
 *     AFTER a successful DB write to evict stale keys.
 *   - Category slug is read from the DB response so the correct category
 *     cache bucket is purged without requiring extra query params.
 */

import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import { invalidateOn } from "../../services/cacheInvalidation";
import type { ListProductsQuery } from "./schema";

// ─── Public Handlers ──────────────────────────────────────────────────────────

/**
 * listProducts — GET /api/products
 *
 * Returns a paginated list of active products.  Response is cached by the
 * upstream `cacheMiddleware(300)` for 5 minutes.
 */
export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsQuery;
    const result = await service.listProducts(query);
    res.json({
      success: true,
      data: result.products,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * getProduct — GET /api/products/:slug
 *
 * Returns a single product by slug.  Cached for 10 minutes.
 */
export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.getProductBySlug(
      req.params["slug"] as string,
    );
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * getRelatedProducts — GET /api/products/:id/related
 *
 * Returns up to 8 sibling products in the same category.  Cached 5 minutes.
 */
export async function getRelatedProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const products = await service.getRelatedProducts(
      req.params["id"] as string,
    );
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

// ─── Admin Handlers ───────────────────────────────────────────────────────────

/**
 * adminListProducts — GET /api/admin/products
 *
 * Admin view: all products including inactive ones.
 * NOT cached — admins always need live data.
 */
export async function adminListProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsQuery;
    const result = await service.adminListProducts(query);
    res.json({
      success: true,
      data: result.products,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * adminCreateProduct — POST /api/admin/products
 *
 * Creates a product, then invalidates:
 *   - products:all
 *   - products:category:<slug>  (if category known from response)
 *   - All search results (products:search:*)
 */
export async function adminCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.createProduct(req.body);

    // Resolve category slug from nested join if available
    const categorySlug =
      (product as unknown as { categories?: { slug?: string } }).categories
        ?.slug ?? undefined;

    invalidateOn("PRODUCT_CREATED", {
      id: product.id,
      categorySlug,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * adminUpdateProduct — PATCH /api/admin/products/:id
 *
 * Updates a product, then invalidates:
 *   - products:id:<id>
 *   - products:all
 *   - products:category:<slug>
 *   - All search results (products:search:*)
 */
export async function adminUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.updateProduct(
      req.params["id"] as string,
      req.body,
    );

    const categorySlug =
      (product as unknown as { categories?: { slug?: string } }).categories
        ?.slug ?? undefined;

    invalidateOn("PRODUCT_UPDATED", {
      id: product.id,
      categorySlug,
    });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * adminDeleteProduct — DELETE /api/admin/products/:id
 *
 * Soft-deletes a product (is_active → false), then invalidates:
 *   - products:id:<id>
 *   - products:all
 *   - products:category:<slug>
 *   - inventory:product:<id>
 *   - All search results (products:search:*)
 *
 * Category slug is fetched from the request body's category_id field if
 * present; otherwise pattern-based eviction covers the remaining cases.
 */
export async function adminDeleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const productId = req.params["id"] as string;
    await service.deleteProduct(productId);

    invalidateOn("PRODUCT_DELETED", {
      id: productId,
      // categorySlug may not be available here; the service doesn't return
      // deleted data. deleteCacheByPattern("products:category:") covers it.
    });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * adminAddProductImage — POST /api/admin/products/:id/images
 *
 * Adds an image to a product.  Invalidates the product detail cache entry
 * since the image list is part of the product response shape.
 */
export async function adminAddProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const productId = req.params["id"] as string;
    const image = await service.addProductImage(productId, req.body);

    invalidateOn("PRODUCT_UPDATED", { id: productId });

    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

/**
 * adminDeleteProductImage — DELETE /api/admin/products/:id/images/:imageId
 *
 * Removes an image from a product.  Invalidates the product detail cache.
 */
export async function adminDeleteProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await service.deleteProductImage(req.params["imageId"] as string);

    invalidateOn("PRODUCT_UPDATED", { id: req.params["id"] as string });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
