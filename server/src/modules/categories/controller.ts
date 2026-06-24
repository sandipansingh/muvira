/**
 * categories/controller.ts
 *
 * Cache integration:
 *   - Public GET handlers (listCategories, getCategory) are cached by
 *     `cacheMiddleware(1800)` in routes.ts — no changes needed here.
 *
 *   - Admin mutation handlers call `invalidateOn("CATEGORY_UPDATED", ...)`
 *     after each successful DB write to evict:
 *       - categories:all
 *       - products:category:<slug>
 *
 *   - The category slug is sourced from the service response, not the request,
 *     so the correct key is always evicted even if the slug changed.
 */

import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import { invalidateOn } from "../../services/cacheInvalidation";

// ─── Public Handlers ──────────────────────────────────────────────────────────

export async function listCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await service.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await service.getCategoryBySlug(
      req.params["slug"] as string,
    );
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

// ─── Admin Handlers ───────────────────────────────────────────────────────────

export async function adminListCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await service.listAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

/**
 * adminCreateCategory — POST /api/admin/categories
 *
 * Creates a category, then invalidates `categories:all`.
 */
export async function adminCreateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await service.createCategory(req.body);

    invalidateOn("CATEGORY_UPDATED", { slug: category.slug });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

/**
 * adminUpdateCategory — PATCH /api/admin/categories/:id
 *
 * Updates a category.  Invalidates:
 *   - categories:all
 *   - products:category:<slug>  (the slug AFTER the update)
 *
 * If the slug itself changed, both the old and new slug buckets should be
 * purged.  We pass the new slug here; the old slug is handled by the broad
 * deleteCacheByPattern("products:category:") call in cacheInvalidation.ts.
 */
export async function adminUpdateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await service.updateCategory(
      req.params["id"] as string,
      req.body,
    );

    invalidateOn("CATEGORY_UPDATED", { slug: category.slug });

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

/**
 * adminDeleteCategory — DELETE /api/admin/categories/:id
 *
 * Deletes a category.  Invalidates `categories:all`.
 * Products previously in this category may return without a category after
 * deletion; their individual caches are handled by the PRODUCT_UPDATED
 * invalidation which admins should trigger manually if needed.
 */
export async function adminDeleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Fetch slug before deletion so we can target the right cache key
    const category = await service.getCategoryById(req.params["id"] as string);

    await service.deleteCategory(req.params["id"] as string);

    invalidateOn("CATEGORY_UPDATED", { slug: category.slug });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
