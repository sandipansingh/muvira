import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import {
  checkoutLimiter,
  checkoutQuoteLimiter,
  checkoutStatusLimiter,
} from '../../middleware/rateLimit'
import {
  CancelCheckoutSchema,
  CheckoutQuoteSchema,
  CreateCheckoutOrderSchema,
  CheckoutSessionParamsSchema,
  CheckoutAttemptSchema,
  CheckoutRequestParamsSchema,
} from './schema'
import * as controller from './controller'

export const checkoutRouter = Router()

checkoutRouter.use(requireAuth)
checkoutRouter.post(
  '/attempts',
  checkoutStatusLimiter,
  validate({ body: CheckoutAttemptSchema }),
  controller.initializeAttempt
)
checkoutRouter.get(
  '/requests/:requestId',
  checkoutStatusLimiter,
  validate({ params: CheckoutRequestParamsSchema }),
  controller.requestSession
)
checkoutRouter.get('/payment-config', checkoutStatusLimiter, controller.paymentConfig)
checkoutRouter.get('/active', checkoutStatusLimiter, controller.active)
checkoutRouter.post(
  '/:orderId/reconcile',
  checkoutStatusLimiter,
  validate({ params: CheckoutSessionParamsSchema }),
  controller.reconcile
)

checkoutRouter.post(
  '/quote',
  checkoutQuoteLimiter,
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
