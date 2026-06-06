import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

// User: preview coupon discount (applied against current cart subtotal)
export async function applyCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body as { code: string };
    const subtotalPaisa = Number(req.body['subtotal_paisa'] ?? 0);

    const { coupon, discountPaisa } = await service.validateCoupon(code, subtotalPaisa);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount_paisa: discountPaisa,
        description: coupon.description,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Admin CRUD
export async function adminListCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '20', 10)));

    const result = await service.adminListCouponsPaginated(page, limit);
    res.json({
      success: true,
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
}

export async function adminCreateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await service.createCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

export async function adminUpdateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await service.updateCoupon(req.params['id'] as string, req.body);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

export async function adminDeactivateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await service.deactivateCoupon(req.params['id'] as string);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}
