import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { noStore } from '../../middleware/noStore'
import {
  ListProductsQuerySchema,
  ProductParamsSchema,
  ProductIdParamsSchema,
  CreateProductSchema,
  UpdateProductSchema,
  AddProductImageSchema,
} from './schema'
import * as controller from './controller'

export const productsRouter = Router()

// Every product representation contains stock; process-local caches cannot track other replicas.
productsRouter.use(noStore)

productsRouter.get('/', validate({ query: ListProductsQuerySchema }), controller.listProducts)

productsRouter.get('/:slug', validate({ params: ProductParamsSchema }), controller.getProduct)

productsRouter.get(
  '/:id/related',
  validate({ params: ProductIdParamsSchema }),
  controller.getRelatedProducts
)

export const adminProductsRouter = Router()
adminProductsRouter.use(noStore)

adminProductsRouter.get(
  '/',
  validate({ query: ListProductsQuerySchema }),
  controller.adminListProducts
)

adminProductsRouter.get(
  '/:id',
  validate({ params: ProductIdParamsSchema }),
  controller.adminGetProduct
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

adminProductsRouter.patch(
  '/:id/images/:imageId',
  validate({
    params: z.object({ id: z.string().uuid(), imageId: z.string().uuid() }),
    body: z.object({ alt_text: z.string().max(300) }).strict(),
  }),
  controller.adminUpdateProductImage
)
