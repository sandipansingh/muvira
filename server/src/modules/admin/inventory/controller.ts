import type { Request, Response, NextFunction } from 'express';
import * as service from './service';
import type { InventoryQuery } from './schema';

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as InventoryQuery;
    const result = await service.getInventory(query);
    res.json({
      success: true,
      data: result.items,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
}

export async function getLowStockList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await service.getLowStockList();
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
}

export async function updateStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.updateProductStock(req.params['id'] as string, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
