import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import type { ListProductsQuery } from "./schema";

export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductsQuery;
    const result = await service.listProducts(query);
    res.json({
      success: true,
      data: result.products,
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

export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.getProductBySlug(
      req.params["slug"] as string,
    );
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const products = await service.getRelatedProducts(
      req.params["id"] as string,
    );
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

// Admin controllers

export async function adminCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await service.updateProduct(
      req.params["id"] as string,
      req.body,
    );
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await service.deleteProduct(req.params["id"] as string);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function adminAddProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const image = await service.addProductImage(
      req.params["id"] as string,
      req.body,
    );
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteProductImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await service.deleteProductImage(req.params["imageId"] as string);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
