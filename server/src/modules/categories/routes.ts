/**
 * categories/routes.ts
 *
 * Public routes:
 *   GET /api/categories       → list all active categories  (cached 30 min)
 *   GET /api/categories/:slug → single category by slug     (cached 30 min)
 *
 * Admin routes (mounted under /api/admin/categories by app.ts):
 *   GET    /         → list all categories (NOT cached — admin needs live data)
 *   POST   /         → create category → invalidates CATEGORY_UPDATED
 *   PATCH  /:id      → update category → invalidates CATEGORY_UPDATED
 *   DELETE /:id      → delete category → invalidates CATEGORY_UPDATED
 *
 * Categories are extremely stable data — they rarely change and are read on
 * every page load.  A 30-minute TTL gives a strong cache hit rate without
 * risking significant staleness after an admin update (invalidation handles it).
 */

import { Router } from "express";
import { validate } from "../../middleware/validate";
import { cacheMiddleware } from "../../middleware/cacheMiddleware";
import {
  CategoryParamsSchema,
  CategoryIdParamsSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from "./schema";
import * as controller from "./controller";

// ─── Public Routes ────────────────────────────────────────────────────────────

export const categoriesRouter = Router();

/**
 * GET /api/categories
 *
 * Lists all active categories.
 * Cache: 30 min (1800 s)
 * Key:   "GET:/api/categories"
 */
categoriesRouter.get(
  "/",
  cacheMiddleware(1800),                         // 30 min
  controller.listCategories,
);

/**
 * GET /api/categories/:slug
 *
 * Returns a single category by slug.
 * Cache: 30 min (1800 s)
 * Key:   "GET:/api/categories/<slug>"
 */
categoriesRouter.get(
  "/:slug",
  cacheMiddleware(1800),                         // 30 min
  validate({ params: CategoryParamsSchema }),
  controller.getCategory,
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export const adminCategoriesRouter = Router();

/** GET /api/admin/categories — live data, not cached. */
adminCategoriesRouter.get("/", controller.adminListCategories);

/** POST /api/admin/categories — create + CATEGORY_UPDATED invalidation. */
adminCategoriesRouter.post(
  "/",
  validate({ body: CreateCategorySchema }),
  controller.adminCreateCategory,
);

/** PATCH /api/admin/categories/:id — update + CATEGORY_UPDATED invalidation. */
adminCategoriesRouter.patch(
  "/:id",
  validate({ params: CategoryIdParamsSchema, body: UpdateCategorySchema }),
  controller.adminUpdateCategory,
);

/** DELETE /api/admin/categories/:id — delete + CATEGORY_UPDATED invalidation. */
adminCategoriesRouter.delete(
  "/:id",
  validate({ params: CategoryIdParamsSchema }),
  controller.adminDeleteCategory,
);
