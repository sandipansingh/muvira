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
    const coupons = await service.adminListCoupons();
    res.json({ success: true, data: coupons });
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
