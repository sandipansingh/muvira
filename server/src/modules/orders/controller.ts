/**
 * orders/controller.ts
 *
 * Cache integration:
 *   - User GET routes (listOrders, getOrder) are NOT cached by middleware
 *     because they sit behind requireAuth.  The cacheMiddleware skips all
 *     requests that carry an Authorization header, so no extra configuration
 *     is needed — authenticated routes are naturally cache-free.
 *
 *   - Admin mutation routes (adminUpdateStatus, adminUpdateFulfillment,
 *     adminAddNote) call `invalidateOn("ORDER_UPDATED", ...)` after a
 *     successful DB write.
 *
 *   - Note: ORDER_PLACED invalidation is triggered by the checkout module
 *     because that is where the order is first created and where the cart /
 *     inventory state must be evicted.  See checkout/controller.ts.
 *
 * Sensitive data note:
 *   Order payloads contain PII (name, address, phone).  We MUST NOT cache
 *   order responses — they are user-specific and only served to authenticated
 *   users who own the order.
 */

import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import { invalidateOn } from "../../services/cacheInvalidation";
import type { ListOrdersQuery, AdminListOrdersQuery } from "./schema";

// ─── User Handlers ────────────────────────────────────────────────────────────

/**
 * listOrders — GET /api/orders
 *
 * Returns the authenticated user's order history.
 * NOT cached (auth-gated; user-specific data).
 */
export async function listOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListOrdersQuery;
    const result = await service.listUserOrders(req.user!.id, query);
    res.json({
      success: true,
      data: result.orders,
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
 * getOrder — GET /api/orders/:id
 *
 * Returns a single order belonging to the authenticated user.
 * NOT cached (auth-gated; ownership-scoped).
 */
export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.getUserOrder(
      req.user!.id,
      req.params["id"] as string,
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// ─── Admin Handlers ───────────────────────────────────────────────────────────

/**
 * adminListOrders — GET /api/admin/orders
 *
 * Admin order list with filters.  NOT cached — admins need live data.
 */
export async function adminListOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as AdminListOrdersQuery;
    const result = await service.adminListOrders(query);
    res.json({
      success: true,
      data: result.orders,
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
 * adminGetOrder — GET /api/admin/orders/:id
 *
 * Retrieves any order by ID.  NOT cached — admin tool.
 */
export async function adminGetOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.adminGetOrder(req.params["id"] as string);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * adminUpdateStatus — PATCH /api/admin/orders/:id/status
 *
 * Updates the fulfillment/payment status of an order.
 * Invalidates:
 *   - orders:id:<id>
 *   - orders:user:<userId>
 *
 * userId is sourced from the order record returned by the service so we never
 * rely on client-supplied values for cache key construction.
 */
export async function adminUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.adminUpdateOrderStatus(
      req.params["id"] as string,
      req.body,
    );

    invalidateOn("ORDER_UPDATED", {
      id: order.id,
      userId: order.user_id,
    });

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * adminUpdateFulfillment — PATCH /api/admin/orders/:id/fulfillment
 *
 * Updates carrier/tracking info.
 * Invalidates:
 *   - orders:id:<id>
 *   - orders:user:<userId>
 */
export async function adminUpdateFulfillment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.adminUpdateFulfillment(
      req.params["id"] as string,
      req.body,
    );

    invalidateOn("ORDER_UPDATED", {
      id: order.id,
      userId: order.user_id,
    });

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * adminAddNote — POST /api/admin/orders/:id/notes
 *
 * Appends an admin note to an order.
 * Invalidates orders:id:<id> (the note becomes part of the order detail).
 */
export async function adminAddNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await service.adminAddOrderNote(
      req.params["id"] as string,
      req.body,
    );

    invalidateOn("ORDER_UPDATED", {
      id: order.id,
      userId: order.user_id,
    });

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * adminSyncTracking — POST /api/admin/orders/sync-tracking
 *
 * Scans all active orders (non-delivered/non-cancelled with AWB codes)
 * and pulls their status from Shiprocket to sync in bulk.
 */
export async function adminSyncTracking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await service.adminSyncTrackingOrders();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
