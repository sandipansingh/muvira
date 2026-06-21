import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { paymentVerifyLimiter } from '../../middleware/rateLimit';
import { VerifyPaymentSchema } from './schema';
import * as controller from './controller';

// Authenticated payment verification route
export const paymentsRouter = Router();

paymentsRouter.post(
  '/verify',
  requireAuth,
  paymentVerifyLimiter,
  validate({ body: VerifyPaymentSchema }),
  controller.verifyPayment,
);

// Webhook route — NOT behind requireAuth (signature-verified instead)
// Raw body parsing is configured in app.ts BEFORE this route
export const webhooksRouter = Router();

webhooksRouter.post('/razorpay', controller.handleWebhook);
