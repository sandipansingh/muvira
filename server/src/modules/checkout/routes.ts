import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import { checkoutLimiter } from '../../middleware/rateLimit'
import { CancelCheckoutSchema, CheckoutQuoteSchema, CreateCheckoutOrderSchema } from './schema'
import * as controller from './controller'

export const checkoutRouter = Router()

checkoutRouter.use(requireAuth)

checkoutRouter.post(
  '/quote',
  checkoutLimiter,
  validate({ body: CheckoutQuoteSchema }),
  controller.quote
)
checkoutRouter.post(
  '/cancel',
  checkoutLimiter,
  validate({ body: CancelCheckoutSchema }),
  controller.cancel
)
checkoutRouter.post(
  '/create-order',
  checkoutLimiter,
  validate({ body: CreateCheckoutOrderSchema }),
  controller.createOrder
)
