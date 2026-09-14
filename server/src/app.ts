import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { logger } from './lib/logger'
import { requestIdMiddleware } from './middleware/requestId'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalApiLimiter } from './middleware/rateLimit'
import { requireAuth } from './middleware/requireAuth'
import { requireAdmin } from './middleware/requireAdmin'

// Route modules
import { healthRouter } from './modules/health/routes'
import { productsRouter, adminProductsRouter } from './modules/products/routes'
import { categoriesRouter, adminCategoriesRouter } from './modules/categories/routes'
import { profileRouter } from './modules/profile/routes'
import { addressesRouter } from './modules/addresses/routes'
import { cartRouter } from './modules/cart/routes'
import { couponsRouter, adminCouponsRouter } from './modules/coupons/routes'
import { checkoutRouter } from './modules/checkout/routes'
import { paymentsRouter, webhooksRouter } from './modules/payments/routes'
import { ordersRouter, adminOrdersRouter } from './modules/orders/routes'
import { adminDashboardRouter } from './modules/admin/dashboard/routes'
import { adminInventoryRouter } from './modules/admin/inventory/routes'
import { settingsRouter, adminSettingsRouter } from './modules/settings/routes'
import { adminCacheRouter } from './modules/admin/cache/routes'
import { trackingRouter } from './modules/tracking/routes'
import { reviewsRouter, adminReviewsRouter } from './modules/reviews/routes'
import { shiprocketWebhookRouter, adminShiprocketRouter } from './modules/shiprocket/routes'
import { notificationsRouter, adminNotificationsRouter } from './modules/notifications/routes'
import { adminDiagnosticsRouter } from './modules/admin/diagnostics/routes'

export function createApp() {
  const app = express()

  // Trust first proxy so rate limiting works correctly with X-Forwarded-For
  app.set('trust proxy', 1)

  // 1. Request ID (first middleware)
  app.use(requestIdMiddleware)

  // 2. Structured HTTP logging
  app.use(
    pinoHttp({
      logger,
      // Do not log health check requests - too noisy
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
      // Redact sensitive headers from logs
      redact: [
        'req.headers.authorization',
        'req.headers["x-razorpay-signature"]',
        'req.headers["x-api-key"]',
      ],
      customProps: (req) => ({ requestId: (req as Request).requestId }),
    })
  )

  // 3. Security headers
  app.use(helmet())

  // 4. CORS
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())

  app.use(
    cors({
      origin: (origin, callback) => {
        // Always allow requests with no Origin header.
        // This covers: server-to-server, curl, Postman, health probes,
        // load balancers, and direct browser navigation (which never sends Origin).
        if (!origin) {
          callback(null, true)
          return
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          // Deny without throwing: the request continues (CORS is not access control),
          // but no Access-Control-Allow-Origin header will be set.
          callback(null, false)
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // 5. Raw body for webhooks (must be before json parser)
  // Preserve raw request bytes so webhook handlers can verify HMAC signatures
  app.use(
    '/api/webhooks/razorpay',
    express.raw({ type: 'application/json' }),
    (req: Request, _res: Response, next: NextFunction) => {
      req.rawBody = req.body as Buffer
      next()
    }
  )
  app.use(
    '/api/webhooks/shipment-status',
    express.raw({ type: 'application/json' }),
    (req: Request, _res: Response, next: NextFunction) => {
      req.rawBody = req.body as Buffer
      next()
    }
  )

  // 6. JSON body parser (all other routes)
  app.use(express.json({ limit: '1mb' }))

  // 7. Global rate limiting
  app.use('/api', generalApiLimiter)

  // 8. Routes

  // Public
  app.use('/api/health', healthRouter)
  app.use('/api/products', productsRouter)
  // Reviews are exposed under products namespace: GET/POST /api/products/:productId/reviews
  app.use('/api/products', reviewsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/tracking', trackingRouter)

  // Authenticated user routes
  app.use('/api/profile', profileRouter)
  app.use('/api/addresses', addressesRouter)
  app.use('/api/cart', cartRouter)
  app.use('/api/checkout', checkoutRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/notifications', notificationsRouter)

  // Coupon preview (authenticated)
  app.use('/api/checkout', couponsRouter) // POST /api/checkout/apply (behind requireAuth internally)

  // Webhook - signature-verified (NOT user-auth)
  app.use('/api/webhooks', webhooksRouter)
  app.use('/api/webhooks/shipment-status', shiprocketWebhookRouter)

  // Admin routes - requireAuth + requireAdmin applied here centrally
  const adminRouter = express.Router()
  adminRouter.use(requireAuth, requireAdmin)

  adminRouter.use('/products', adminProductsRouter)
  adminRouter.use('/categories', adminCategoriesRouter)
  adminRouter.use('/coupons', adminCouponsRouter)
  adminRouter.use('/orders', adminOrdersRouter)
  adminRouter.use('/dashboard', adminDashboardRouter)
  adminRouter.use('/inventory', adminInventoryRouter)
  adminRouter.use('/settings', adminSettingsRouter)
  adminRouter.use('/cache', adminCacheRouter)
  adminRouter.use('/reviews', adminReviewsRouter)
  adminRouter.use('/shiprocket', adminShiprocketRouter)
  adminRouter.use('/notifications', adminNotificationsRouter)
  adminRouter.use('/diagnostics', adminDiagnosticsRouter)

  app.use('/api/admin', adminRouter)

  // 9. 404 handler
  app.use(notFoundHandler)

  // 10. Centralized error handler (must have 4 parameters)
  app.use(errorHandler)

  return app
}
