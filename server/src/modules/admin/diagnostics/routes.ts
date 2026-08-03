import { Router } from 'express'
import * as controller from './controller'

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

// Emergency-only: refresh a single shipment from Shiprocket
// This calls Shiprocket API directly — use sparingly, audit-logged
adminDiagnosticsRouter.post('/shipments/:orderId/refresh', controller.refreshShipment)
adminDiagnosticsRouter.get('/circuit-breaker', controller.getCircuitBreaker)
adminDiagnosticsRouter.post('/circuit-breaker/reset', controller.resetCircuitBreaker)

