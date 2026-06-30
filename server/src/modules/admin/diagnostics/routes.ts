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
