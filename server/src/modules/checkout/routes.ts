import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import { checkoutLimiter } from '../../middleware/rateLimit'
import { CreateOrderSchema } from './schema'
import * as controller from './controller'

export const checkoutRouter = Router()

checkoutRouter.use(requireAuth)

checkoutRouter.post(
  '/create-order',
  checkoutLimiter,
  validate({ body: CreateOrderSchema }),
  controller.createOrder
)
