import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import {
  CategoryParamsSchema,
  CategoryIdParamsSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from './schema'
import * as controller from './controller'

// ─── Public Routes ────────────────────────────────────────────────────────────

export const categoriesRouter = Router()

categoriesRouter.get(
  '/',
  cacheMiddleware(1800), // 30 min
  controller.listCategories
)

categoriesRouter.get(
  '/:slug',
  cacheMiddleware(1800), // 30 min
  validate({ params: CategoryParamsSchema }),
  controller.getCategory
)

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export const adminCategoriesRouter = Router()

adminCategoriesRouter.get('/', controller.adminListCategories)

adminCategoriesRouter.post(
  '/',
  validate({ body: CreateCategorySchema }),
  controller.adminCreateCategory
)

adminCategoriesRouter.patch(
  '/:id',
  validate({ params: CategoryIdParamsSchema, body: UpdateCategorySchema }),
  controller.adminUpdateCategory
)

adminCategoriesRouter.delete(
  '/:id',
  validate({ params: CategoryIdParamsSchema }),
  controller.adminDeleteCategory
)
