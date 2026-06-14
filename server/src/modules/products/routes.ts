import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import {
  ListProductsQuerySchema,
  ProductParamsSchema,
  ProductIdParamsSchema,
  CreateProductSchema,
  UpdateProductSchema,
  AddProductImageSchema,
} from './schema'
import * as controller from './controller'

// ─── Public Routes ────────────────────────────────────────────────────────────

export const productsRouter = Router()

productsRouter.get(
  '/',
  cacheMiddleware(300), // 5 min
  validate({ query: ListProductsQuerySchema }),
  controller.listProducts
)

productsRouter.get(
  '/:slug',
  cacheMiddleware(600), // 10 min
  validate({ params: ProductParamsSchema }),
  controller.getProduct
)

productsRouter.get(
  '/:id/related',
  cacheMiddleware(300), // 5 min
  validate({ params: ProductIdParamsSchema }),
  controller.getRelatedProducts
)

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export const adminProductsRouter = Router()

adminProductsRouter.get(
  '/',
  validate({ query: ListProductsQuerySchema }),
  controller.adminListProducts
)

adminProductsRouter.post(
  '/',
  validate({ body: CreateProductSchema }),
  controller.adminCreateProduct
)

adminProductsRouter.patch(
  '/:id',
  validate({ params: ProductIdParamsSchema, body: UpdateProductSchema }),
  controller.adminUpdateProduct
)

adminProductsRouter.delete(
  '/:id',
  validate({ params: ProductIdParamsSchema }),
  controller.adminDeleteProduct
)

adminProductsRouter.post(
  '/:id/images',
  validate({ params: ProductIdParamsSchema, body: AddProductImageSchema }),
  controller.adminAddProductImage
)

adminProductsRouter.delete(
  '/:id/images/:imageId',
  validate({
    params: z.object({ id: z.string().uuid(), imageId: z.string().uuid() }),
  }),
  controller.adminDeleteProductImage
)

adminProductsRouter.patch(
  '/:id/images/reorder',
  validate({
    params: ProductIdParamsSchema,
    body: z.object({
      imageIds: z.array(z.string().uuid()),
    }),
  }),
  controller.adminReorderProductImages
)
