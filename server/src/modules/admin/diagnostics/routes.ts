import { Router } from 'express'
import * as controller from './controller'
import { validate } from '../../../middleware/validate'
import { DiagnosticActionSchema, DiagnosticIdParamsSchema } from './schema'

export const adminDiagnosticsRouter = Router()

adminDiagnosticsRouter.get('/summary', controller.getSummary)
adminDiagnosticsRouter.get('/shipment-health', controller.getShipmentHealth)
adminDiagnosticsRouter.get('/sync-health', controller.getSyncHealth)
adminDiagnosticsRouter.get('/webhook-logs', controller.getWebhookLogs)
adminDiagnosticsRouter.get('/retry-queue', controller.getRetryQueue)
adminDiagnosticsRouter.post('/retry-queue/:id/retry', controller.retryJob)
adminDiagnosticsRouter.get('/shiprocket-errors', controller.getShiprocketErrors)
adminDiagnosticsRouter.get('/courier-performance', controller.getCourierPerformance)
adminDiagnosticsRouter.get('/metrics', controller.getMetrics)
adminDiagnosticsRouter.get('/commerce-failures', controller.getCommerceFailures)
adminDiagnosticsRouter.post(
  '/provider-operations/:id/reconcile',
  validate({ params: DiagnosticIdParamsSchema, body: DiagnosticActionSchema }),
  controller.reconcileProviderOperation
)
adminDiagnosticsRouter.post(
  '/retained-checkouts/:id/recheck',
  validate({ params: DiagnosticIdParamsSchema, body: DiagnosticActionSchema }),
  controller.recheckRetainedCheckout
)
adminDiagnosticsRouter.post(
  '/retained-checkouts/:id/release',
  validate({ params: DiagnosticIdParamsSchema, body: DiagnosticActionSchema }),
  controller.releaseRetainedCheckout
)

// Emergency-only: refresh a single shipment from Shiprocket
// This calls Shiprocket API directly — use sparingly, audit-logged
adminDiagnosticsRouter.post('/shipments/:orderId/refresh', controller.refreshShipment)
adminDiagnosticsRouter.get('/circuit-breaker', controller.getCircuitBreaker)
adminDiagnosticsRouter.post('/circuit-breaker/reset', controller.resetCircuitBreaker)
