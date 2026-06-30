import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import {
  OrderIdParamsSchema,
  ListOrdersQuerySchema,
  AdminListOrdersQuerySchema,
  UpdateOrderStatusSchema,
  UpdateFulfillmentSchema,
  AddOrderNoteSchema,
  AssignAwbSchema,
  CreateShipmentSchema,
  FulfillOrderSchema,
} from './schema'
import * as controller from './controller'

// User order routes
export const ordersRouter = Router()

ordersRouter.use(requireAuth)

ordersRouter.get('/', validate({ query: ListOrdersQuerySchema }), controller.listOrders)
ordersRouter.get('/:id', validate({ params: OrderIdParamsSchema }), controller.getOrder)
ordersRouter.get('/:id/tracking', validate({ params: OrderIdParamsSchema }), controller.getOrderTracking)

// Admin order routes - requireAdmin is applied in the parent admin router
export const adminOrdersRouter = Router()

adminOrdersRouter.get(
  '/',
  validate({ query: AdminListOrdersQuerySchema }),
  controller.adminListOrders
)
adminOrdersRouter.post('/sync-tracking', controller.adminSyncTracking)
adminOrdersRouter.get('/:id', validate({ params: OrderIdParamsSchema }), controller.adminGetOrder)
adminOrdersRouter.patch(
  '/:id/status',
  validate({ params: OrderIdParamsSchema, body: UpdateOrderStatusSchema }),
  controller.adminUpdateStatus
)
adminOrdersRouter.patch(
  '/:id/fulfillment',
  validate({ params: OrderIdParamsSchema, body: UpdateFulfillmentSchema }),
  controller.adminUpdateFulfillment
)
adminOrdersRouter.post(
  '/:id/notes',
  validate({ params: OrderIdParamsSchema, body: AddOrderNoteSchema }),
  controller.adminAddNote
)

// Shiprocket fulfillment actions
adminOrdersRouter.post(
  '/:id/assign-awb',
  validate({ params: OrderIdParamsSchema, body: AssignAwbSchema }),
  controller.adminAssignAwb
)
adminOrdersRouter.post('/:id/schedule-pickup', controller.adminSchedulePickup)
adminOrdersRouter.post('/:id/generate-label', controller.adminGenerateLabel)
adminOrdersRouter.post('/:id/generate-manifest', controller.adminGenerateManifest)
adminOrdersRouter.post('/:id/generate-invoice', controller.adminGenerateInvoice)
adminOrdersRouter.post(
  '/:id/shiprocket-cancel',
  validate({ params: OrderIdParamsSchema }),
  controller.adminCancelShiprocketOrder
)
adminOrdersRouter.post(
  '/:id/cancel-shipment',
  validate({ params: OrderIdParamsSchema }),
  controller.adminCancelShiprocketShipment
)
adminOrdersRouter.post('/:id/retry-shiprocket', controller.adminRetryShiprocket)
adminOrdersRouter.post(
  '/:id/create-shipment',
  validate({ params: OrderIdParamsSchema, body: CreateShipmentSchema }),
  controller.adminCreateShipment
)
adminOrdersRouter.post(
  '/:id/fulfill',
  validate({ params: OrderIdParamsSchema, body: FulfillOrderSchema }),
  controller.adminFulfillOrder
)
