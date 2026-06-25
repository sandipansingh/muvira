import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { invalidateOn } from '../../services/cacheInvalidation'

export async function listCategories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await service.listCategories()
    res.json({ success: true, data: categories })
  } catch (err) {
    next(err)
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await service.getCategoryBySlug(req.params['slug'] as string)
    res.json({ success: true, data: category })
  } catch (err) {
    next(err)
  }
}

export async function adminListCategories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '20', 10)))
    const q = (req.query['q'] as string) || undefined

    const result = await service.listAllCategoriesPaginated(page, limit, q)
    res.json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function adminCreateCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = await service.createCategory(req.body)

    invalidateOn('CATEGORY_UPDATED', { slug: category.slug })

    res.status(201).json({ success: true, data: category })
  } catch (err) {
    next(err)
  }
}

export async function adminUpdateCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = await service.updateCategory(req.params['id'] as string, req.body)

    invalidateOn('CATEGORY_UPDATED', { slug: category.slug })

    res.json({ success: true, data: category })
  } catch (err) {
    next(err)
  }
}

export async function adminDeleteCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Fetch slug before deletion so we can target the right cache key
    const category = await service.getCategoryById(req.params['id'] as string)

    await service.deleteCategory(req.params['id'] as string)

    invalidateOn('CATEGORY_UPDATED', { slug: category.slug })

    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}
