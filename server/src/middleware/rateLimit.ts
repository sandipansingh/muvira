/**
 * Rate limiting configuration.
 *
 * Applied to sensitive routes to mitigate brute-force and abuse:
 *  - checkoutLimiter   — POST /api/checkout/create-order
 *  - paymentLimiter    — POST /api/payments/verify
 *  - generalApiLimiter — all other /api/* routes
 */
import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

/** Strict limiter for checkout — prevents order-spam and cart-total probing */
export const checkoutLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many checkout requests. Please wait before trying again.',
    },
  },
});

/** Strict limiter for payment verification — prevents signature-brute-force */
export const paymentVerifyLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many payment verification attempts.',
    },
  },
});

/** General API limiter — applied globally */
export const generalApiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
    },
  },
});
