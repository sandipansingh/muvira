import rateLimit from 'express-rate-limit'
import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { env } from '../config/env'

const FIFTEEN_MINUTES = 15 * 60 * 1000
const ONE_MINUTE = 60 * 1000

export const razorpayWebhookLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Webhook delivery budget exceeded.' },
  },
})

export const checkoutQuoteLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  max: 120,
  keyGenerator: (req) => req.user!.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Please wait before refreshing your total again.' },
  },
})

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

export const checkoutStatusLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Please wait before checking payment status again.' },
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

const seoCatalogLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 3000,
  keyGenerator: () => 'frontend-catalog',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Catalog request limit reached.' },
  },
})

export const catalogApiLimiter: RequestHandler = (req, res, next) => {
  if (/^\/webhooks\/razorpay\/?$/.test(req.path)) return next()
  // Quotes use their own authenticated budget so refreshes cannot exhaust payment access.
  if (req.method === 'POST' && /^\/checkout\/quote\/?$/.test(req.path)) return next()
  const supplied = req.get('X-Muvira-SEO-Token')
  const expected = env.SEO_INTERNAL_TOKEN
  const catalogGet =
    req.method === 'GET' && /^\/(products|categories)(\/[a-z0-9-]+)?\/?$/.test(req.path)
  const verified =
    catalogGet &&
    !!expected &&
    !!supplied &&
    Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  return (verified ? seoCatalogLimiter : generalApiLimiter)(req, res, next)
}
