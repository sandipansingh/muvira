import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  ListProductsQuerySchema,
  ProductParamsSchema,
  ProductIdParamsSchema,
  CreateProductSchema,
  UpdateProductSchema,
  AddProductImageSchema,
} from "./schema";
import * as controller from "./controller";

// Public product routes
export const productsRouter = Router();

productsRouter.get(
  "/",
  validate({ query: ListProductsQuerySchema }),
  controller.listProducts,
);

productsRouter.get(
  "/:slug",
  validate({ params: ProductParamsSchema }),
  controller.getProduct,
);

productsRouter.get(
  "/:id/related",
  validate({ params: ProductIdParamsSchema }),
  controller.getRelatedProducts,
);

// Admin product routes
export const adminProductsRouter = Router();

adminProductsRouter.post(
  "/",
  validate({ body: CreateProductSchema }),
  controller.adminCreateProduct,
);

adminProductsRouter.patch(
  "/:id",
  validate({ params: ProductIdParamsSchema, body: UpdateProductSchema }),
  controller.adminUpdateProduct,
);

adminProductsRouter.delete(
  "/:id",
  validate({ params: ProductIdParamsSchema }),
  controller.adminDeleteProduct,
);

adminProductsRouter.post(
  "/:id/images",
  validate({ params: ProductIdParamsSchema, body: AddProductImageSchema }),
  controller.adminAddProductImage,
);

adminProductsRouter.delete(
  "/:id/images/:imageId",
  validate({
    params: z.object({ id: z.string().uuid(), imageId: z.string().uuid() }),
  }),
  controller.adminDeleteProductImage,
);
