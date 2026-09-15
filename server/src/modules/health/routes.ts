import { Router, type Response } from 'express'
import { env } from '../../config/env'
import { getMetricsSnapshot } from '../../services/metricsCollector'
import {
  getRuntimeSchemaStatus,
  RUNTIME_SCHEMA_CONTRACT_VERSION,
} from '../../services/runtimeSchema'

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

async function readinessChecks() {
  const schema = await getRuntimeSchemaStatus({ forceRefresh: true })
  return {
    schema,
    services: {
      database: schema.contract ? 'ok' : 'error',
      database_contract: schema.ready ? 'ok' : 'error',
      razorpay: 'configured',
      shiprocket: 'configured',
      shiprocket_webhook: env.SHIPROCKET_WEBHOOK_ENABLED === 'true' ? 'enabled' : 'disabled',
      email: env.RESEND_API_KEY ? 'configured' : 'disabled',
    },
  }
}

async function sendReadiness(res: Response, includeMetrics: boolean) {
  const { schema, services } = await readinessChecks()
  const ready = Object.values(services).every((status) => status !== 'error')
  const metrics = includeMetrics ? getMetricsSnapshot() : null

  res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services,
      database_contract: {
        status: schema.ready ? 'compatible' : 'incompatible',
        expected_version: RUNTIME_SCHEMA_CONTRACT_VERSION,
        reported_version: schema.contract?.contract_version ?? null,
      },
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
