import type { Request, Response, NextFunction } from 'express';
import * as service from './service';
import type { ListOrdersQuery, AdminListOrdersQuery } from './schema';

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as ListOrdersQuery;
    const result = await service.listUserOrders(req.user!.id, query);
    res.json({
      success: true,
      data: result.orders,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.getUserOrder(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function adminListOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as AdminListOrdersQuery;
    const result = await service.adminListOrders(query);
    res.json({
      success: true,
      data: result.orders,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
}

export async function adminGetOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.adminGetOrder(req.params['id'] as string);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function adminUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.adminUpdateOrderStatus(req.params['id'] as string, req.body);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function adminUpdateFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.adminUpdateFulfillment(req.params['id'] as string, req.body);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function adminAddNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await service.adminAddOrderNote(req.params['id'] as string, req.body);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}
