import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { InventoryQuerySchema, UpdateStockSchema } from './schema';
import * as controller from './controller';

export const adminInventoryRouter = Router();

adminInventoryRouter.get(
  '/',
  validate({ query: InventoryQuerySchema }),
  controller.getInventory,
);

adminInventoryRouter.get('/low-stock', controller.getLowStockList);

adminInventoryRouter.patch(
  '/:id/stock',
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateStockSchema,
  }),
  controller.updateStock,
);
