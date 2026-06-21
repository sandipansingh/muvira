import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

export async function listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addresses = await service.listAddresses(req.user!.id);
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
}

export async function createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await service.createAddress(req.user!.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (err) { next(err); }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await service.updateAddress(req.user!.id, req.params['id'] as string, req.body);
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deleteAddress(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}

export async function setDefaultAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await service.setDefaultAddress(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
}
