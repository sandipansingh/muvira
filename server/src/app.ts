/**
 * Express application factory.
 *
 * IMPORTANT — middleware ordering:
 * 1. requestId (first, so all subsequent middleware can reference it)
 * 2. pino-http structured logging
 * 3. helmet (security headers)
 * 4. CORS (must be before rate limiting and routes)
 * 5. express.raw() for the webhook route ONLY — must be BEFORE express.json()
 *    because express.json() consumes the body stream; after that, rawBody is gone
 * 6. express.json() for all other routes
 * 7. Rate limiting
 * 8. Routes
 * 9. 404 handler
 * 10. Centralized error handler (must be last, must have 4 args)
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalApiLimiter } from "./middleware/rateLimit";
import { requireAuth } from "./middleware/requireAuth";
import { requireAdmin } from "./middleware/requireAdmin";

// Route modules
import { healthRouter } from "./modules/health/routes";
import { productsRouter, adminProductsRouter } from "./modules/products/routes";
import {
  categoriesRouter,
  adminCategoriesRouter,
} from "./modules/categories/routes";
import { profileRouter } from "./modules/profile/routes";
import { addressesRouter } from "./modules/addresses/routes";
import { cartRouter } from "./modules/cart/routes";
import { couponsRouter, adminCouponsRouter } from "./modules/coupons/routes";
import { checkoutRouter } from "./modules/checkout/routes";
import { paymentsRouter, webhooksRouter } from "./modules/payments/routes";
import { ordersRouter, adminOrdersRouter } from "./modules/orders/routes";
import { adminDashboardRouter } from "./modules/admin/dashboard/routes";
import { adminInventoryRouter } from "./modules/admin/inventory/routes";
import { settingsRouter, adminSettingsRouter } from "./modules/settings/routes";
import { adminCacheRouter } from "./modules/admin/cache/routes";
import { trackingRouter } from "./modules/tracking/routes";
import { reviewsRouter, adminReviewsRouter } from "./modules/reviews/routes";


export function createApp() {
  const app = express();

  // Trust the first proxy in the chain (reverse proxy / load balancer / container runtime).
  // Required so express-rate-limit can read X-Forwarded-For for accurate client IP
  // identification. Without this, rate-limit v7 throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
  // Set to 1 (trust one hop) — adjust to the actual number of proxies in front if needed.
  app.set("trust proxy", 1);

  // 1. Request ID (first middleware)
  app.use(requestIdMiddleware);

  // 2. Structured HTTP logging
  app.use(
    pinoHttp({
      logger,
      // Do not log health check requests — too noisy
      autoLogging: {
        ignore: (req) => req.url === "/api/health",
      },
      // Redact sensitive headers from logs
      redact: [
        "req.headers.authorization",
        'req.headers["x-razorpay-signature"]',
      ],
      customProps: (req) => ({ requestId: (req as Request).requestId }),
    }),
  );

  // 3. Security headers
  app.use(helmet());

  // 4. CORS
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl) in development
        if (!origin && env.NODE_ENV !== "production") {
          callback(null, true);
          return;
        }
        if (origin && allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // 5. Raw body parser — WEBHOOK ROUTE ONLY
  // CRITICAL: This MUST be registered before express.json().
  // Razorpay signs the raw request bytes. Any JSON re-serialization breaks the
  // signature. The raw Buffer is attached to req.rawBody for signature verification.
  app.use(
    "/api/webhooks/razorpay",
    express.raw({ type: "application/json" }),
    (req: Request, _res: Response, next: NextFunction) => {
      // Attach rawBody so the webhook handler can access it for HMAC verification
      req.rawBody = req.body as Buffer;
      next();
    },
  );

  // 6. JSON body parser (all other routes)
  app.use(express.json({ limit: "1mb" }));

  // 7. Global rate limiting
  app.use("/api", generalApiLimiter);

  // 8. Routes

  // Public
  app.use("/api/health", healthRouter);
  app.use("/api/products", productsRouter);
  // Reviews are exposed under products namespace: GET/POST /api/products/:productId/reviews
  app.use("/api/products", reviewsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/tracking", trackingRouter);


  // Authenticated user routes
  app.use("/api/profile", profileRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/orders", ordersRouter);

  // Coupon preview (authenticated)
  app.use("/api/checkout", couponsRouter); // POST /api/checkout/apply (behind requireAuth internally)

  // Webhook — signature-verified (NOT user-auth)
  app.use("/api/webhooks", webhooksRouter);

  // Admin routes — requireAuth + requireAdmin applied here centrally
  const adminRouter = express.Router();
  adminRouter.use(requireAuth, requireAdmin);

  adminRouter.use("/products", adminProductsRouter);
  adminRouter.use("/categories", adminCategoriesRouter);
  adminRouter.use("/coupons", adminCouponsRouter);
  adminRouter.use("/orders", adminOrdersRouter);
  adminRouter.use("/dashboard", adminDashboardRouter);
  adminRouter.use("/inventory", adminInventoryRouter);
  adminRouter.use("/settings", adminSettingsRouter);
  adminRouter.use("/cache", adminCacheRouter);
  adminRouter.use("/reviews", adminReviewsRouter);

  app.use("/api/admin", adminRouter);

  // 9. 404 handler
  app.use(notFoundHandler);

  // 10. Centralized error handler (must have 4 parameters)
  app.use(errorHandler);

  return app;
}
