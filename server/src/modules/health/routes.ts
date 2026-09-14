import { Router, type Response } from 'express'
import { env } from '../../config/env'
import { adminSupabase } from '../../lib/supabase/admin'
import { getMetricsSnapshot } from '../../services/metricsCollector'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  })
})

async function probeTable(table: string): Promise<'ok' | 'error'> {
  try {
    const { error } = await adminSupabase.from(table).select('*', { head: true }).limit(1)
    return error ? 'error' : 'ok'
  } catch {
    return 'error'
  }
}

async function readinessChecks(): Promise<Record<string, string>> {
  const [database, checkoutSchema, notificationSchema, invoiceSchema] = await Promise.all([
    probeTable('profiles'),
    probeTable('outbox_events'),
    probeTable('notification_deliveries'),
    probeTable('invoice_records'),
  ])

  return {
    database,
    checkout_schema: checkoutSchema,
    notification_schema: notificationSchema,
    invoice_schema: invoiceSchema,
    razorpay: 'configured',
    shiprocket: 'configured',
    shiprocket_webhook: env.SHIPROCKET_WEBHOOK_ENABLED === 'true' ? 'enabled' : 'disabled',
    email: env.RESEND_API_KEY ? 'configured' : 'disabled',
  }
}

async function sendReadiness(res: Response, includeMetrics: boolean) {
  const checks = await readinessChecks()
  const ready = Object.values(checks).every((status) => status !== 'error')
  const metrics = includeMetrics ? getMetricsSnapshot() : null

  res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: checks,
      ...(metrics && {
        metrics: {
          uptime_seconds: metrics.server_uptime_seconds,
          memory_mb: metrics.memory_mb,
          shiprocket_calls: metrics.shiprocketApi.callsTotal,
          webhooks_received: metrics.webhook.received,
          orders_synced: metrics.sync.ordersSyncedTotal,
        },
      }),
    },
  })
}

healthRouter.get('/ready', async (_req, res) => {
  await sendReadiness(res, false)
})

healthRouter.get('/full', async (_req, res) => {
  await sendReadiness(res, true)
})
