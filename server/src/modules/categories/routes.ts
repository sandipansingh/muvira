import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { CategoryParamsSchema, CategoryIdParamsSchema, CreateCategorySchema, UpdateCategorySchema } from './schema';
import * as controller from './controller';

export const categoriesRouter = Router();

categoriesRouter.get('/', controller.listCategories);
categoriesRouter.get('/:slug', validate({ params: CategoryParamsSchema }), controller.getCategory);

export const adminCategoriesRouter = Router();

adminCategoriesRouter.get('/', controller.adminListCategories);
adminCategoriesRouter.post('/', validate({ body: CreateCategorySchema }), controller.adminCreateCategory);
adminCategoriesRouter.patch('/:id', validate({ params: CategoryIdParamsSchema, body: UpdateCategorySchema }), controller.adminUpdateCategory);
adminCategoriesRouter.delete('/:id', validate({ params: CategoryIdParamsSchema }), controller.adminDeleteCategory);
