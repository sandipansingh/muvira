import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.createCheckoutOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
