import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import {
  OrderIdParamsSchema,
  ListOrdersQuerySchema,
  AdminListOrdersQuerySchema,
  UpdateOrderStatusSchema,
  UpdateFulfillmentSchema,
  AddOrderNoteSchema,
} from './schema';
import * as controller from './controller';

// User order routes
export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/', validate({ query: ListOrdersQuerySchema }), controller.listOrders);
ordersRouter.get('/:id', validate({ params: OrderIdParamsSchema }), controller.getOrder);

// Admin order routes — requireAdmin is applied in the parent admin router
export const adminOrdersRouter = Router();

adminOrdersRouter.get('/', validate({ query: AdminListOrdersQuerySchema }), controller.adminListOrders);
adminOrdersRouter.get('/:id', validate({ params: OrderIdParamsSchema }), controller.adminGetOrder);
adminOrdersRouter.patch(
  '/:id/status',
  validate({ params: OrderIdParamsSchema, body: UpdateOrderStatusSchema }),
  controller.adminUpdateStatus,
);
adminOrdersRouter.patch(
  '/:id/fulfillment',
  validate({ params: OrderIdParamsSchema, body: UpdateFulfillmentSchema }),
  controller.adminUpdateFulfillment,
);
adminOrdersRouter.post(
  '/:id/notes',
  validate({ params: OrderIdParamsSchema, body: AddOrderNoteSchema }),
  controller.adminAddNote,
);
