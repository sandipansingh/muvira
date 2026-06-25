import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import {
  ApplyCouponSchema,
  CouponIdParamsSchema,
  CreateCouponSchema,
  UpdateCouponSchema,
} from './schema'
import * as controller from './controller'

// User route - apply a coupon to preview its discount
export const couponsRouter = Router()

couponsRouter.use(requireAuth)

couponsRouter.post(
  '/apply',
  validate({
    body: ApplyCouponSchema.extend({ subtotal_paisa: z.number().int().min(0) }).strict(),
  }),
  controller.applyCoupon
)

// Admin coupon routes
export const adminCouponsRouter = Router()

adminCouponsRouter.get('/', controller.adminListCoupons)
adminCouponsRouter.post('/', validate({ body: CreateCouponSchema }), controller.adminCreateCoupon)
adminCouponsRouter.patch(
  '/:id',
  validate({ params: CouponIdParamsSchema, body: UpdateCouponSchema }),
  controller.adminUpdateCoupon
)
adminCouponsRouter.post(
  '/:id/deactivate',
  validate({ params: CouponIdParamsSchema }),
  controller.adminDeactivateCoupon
)
