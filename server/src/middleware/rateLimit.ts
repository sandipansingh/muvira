import rateLimit from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000
const ONE_MINUTE = 60 * 1000

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
})

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
})

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
})
