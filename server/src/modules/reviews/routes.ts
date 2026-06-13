import { Router } from "express";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/requireAuth";
import {
  ProductReviewsQuerySchema,
  ProductIdParamsSchema,
  ReviewIdParamsSchema,
  CreateReviewSchema,
  AdminReviewsQuerySchema,
} from "./schema";
import * as controller from "./controller";

export const reviewsRouter = Router();

// Public review listing (no auth)
// Mounted under /api/products so path becomes /api/products/:productId/reviews
reviewsRouter.get(
  "/:productId/reviews",
  validate({ params: ProductIdParamsSchema, query: ProductReviewsQuerySchema }),
  controller.listReviews,
);

// Authenticated users submit (or update) a review
reviewsRouter.post(
  "/:productId/reviews",
  requireAuth,
  validate({ params: ProductIdParamsSchema, body: CreateReviewSchema }),
  controller.submitReview,
);

// ─── Admin routes ─────────────────────────────────────────────────────────────

export const adminReviewsRouter = Router();

adminReviewsRouter.get(
  "/",
  validate({ query: AdminReviewsQuerySchema }),
  controller.adminListReviews,
);

adminReviewsRouter.delete(
  "/:id",
  validate({ params: ReviewIdParamsSchema }),
  controller.adminDeleteReview,
);
