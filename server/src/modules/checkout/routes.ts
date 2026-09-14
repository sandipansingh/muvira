import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import { checkoutLimiter } from '../../middleware/rateLimit'
import { CheckoutQuoteSchema } from './schema'
import * as controller from './controller'

export const checkoutRouter = Router()

checkoutRouter.use(requireAuth)

checkoutRouter.post(
  '/quote',
  checkoutLimiter,
  validate({ body: CheckoutQuoteSchema }),
  controller.quote
)
