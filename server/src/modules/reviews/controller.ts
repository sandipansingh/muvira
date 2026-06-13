import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import type {
  ProductReviewsQuery,
  CreateReviewInput,
  AdminReviewsQuery,
} from "./schema";

// Public: GET /api/products/:productId/reviews
export async function listReviews(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const productId = req.params["productId"] as string;
    const query = req.query as unknown as ProductReviewsQuery;
    const result = await service.listProductReviews(productId, query);

    res.json({
      success: true,
      data: {
        reviews: result.reviews,
        summary: result.summary,
      },
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

// Authenticated user: POST /api/products/:productId/reviews
// Creates or updates the caller's review for the product
export async function submitReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const productId = req.params["productId"] as string;
    const userId = req.user!.id;
    const input = req.body as CreateReviewInput;

    const review = await service.createOrUpdateReview(productId, userId, input);

    // Also return the fresh summary
    const fresh = await service.listProductReviews(productId, { page: 1, limit: 1 });

    res.status(201).json({
      success: true,
      data: {
        review,
        summary: fresh.summary,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Admin: GET /api/admin/reviews
export async function adminListReviews(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as AdminReviewsQuery;
    const result = await service.adminListReviews(query);
    res.json({
      success: true,
      data: result.reviews,
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

// Admin: DELETE /api/admin/reviews/:id
export async function adminDeleteReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await service.adminDeleteReview(req.params["id"] as string);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}
