import type { Request, Response, NextFunction } from 'express'
import * as service from './service'
import { invalidateOn } from '../../services/cacheInvalidation'
import type { ListProductsQuery } from './schema'

// ─── Public Handlers ──────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsQuery
    const result = await service.listProducts(query)
    res.json({
      success: true,
      data: result.products,
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

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await service.getProductBySlug(req.params['slug'] as string)
    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function getRelatedProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await service.getRelatedProducts(req.params['id'] as string)
    res.json({ success: true, data: products })
  } catch (err) {
    next(err)
  }
}

// ─── Admin Handlers ───────────────────────────────────────────────────────────

export async function adminListProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsQuery
    const result = await service.adminListProducts(query)
    res.json({
      success: true,
      data: result.products,
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

export async function adminCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await service.createProduct(req.body)

    // Resolve category slug from nested join if available
    const categorySlug =
      (product as unknown as { categories?: { slug?: string } }).categories?.slug ?? undefined

    invalidateOn('PRODUCT_CREATED', {
      id: product.id,
      categorySlug,
    })

    res.status(201).json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function adminUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await service.updateProduct(req.params['id'] as string, req.body)

    const categorySlug =
      (product as unknown as { categories?: { slug?: string } }).categories?.slug ?? undefined

    invalidateOn('PRODUCT_UPDATED', {
      id: product.id,
      categorySlug,
    })

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function adminDeleteProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = req.params['id'] as string
    await service.deleteProduct(productId)

    invalidateOn('PRODUCT_DELETED', {
      id: productId,
      // categorySlug may not be available here; the service doesn't return
      // deleted data. deleteCacheByPattern("products:category:") covers it.
    })

    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function adminAddProductImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = req.params['id'] as string
    const image = await service.addProductImage(productId, req.body)

    invalidateOn('PRODUCT_UPDATED', { id: productId })

    res.status(201).json({ success: true, data: image })
  } catch (err) {
    next(err)
  }
}

export async function adminDeleteProductImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await service.deleteProductImage(req.params['imageId'] as string)

    invalidateOn('PRODUCT_UPDATED', { id: req.params['id'] as string })

    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function adminReorderProductImages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = req.params['id'] as string
    const { imageIds } = req.body as { imageIds: string[] }

    await service.reorderProductImages(productId, imageIds)

    invalidateOn('PRODUCT_UPDATED', { id: productId })

    const product = await service.getProductById(productId)

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}
