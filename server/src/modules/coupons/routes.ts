import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { CouponIdParamsSchema, CreateCouponSchema, UpdateCouponSchema } from './schema'
import * as controller from './controller'

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
