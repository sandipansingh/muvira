import type { Request, Response, NextFunction } from 'express';
import * as service from './service';

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await service.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await service.getCategoryBySlug(req.params['slug'] as string);
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function adminListCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await service.listAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

export async function adminCreateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await service.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function adminUpdateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await service.updateCategory(req.params['id'] as string, req.body);
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function adminDeleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deleteCategory(req.params['id'] as string);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}
