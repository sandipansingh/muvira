import { Router } from 'express'
import { adminSupabase } from '../../lib/supabase/admin'
import { getToken as shiprocketAuthCheck } from '../../lib/shiprocketHealth'
import { getMetricsSnapshot } from '../../services/metricsCollector'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  let dbStatus = 'ok'
  try {
    const { error } = await adminSupabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
    if (error) dbStatus = 'degraded'
  } catch {
    dbStatus = 'error'
  }

  const status = dbStatus === 'ok' ? 200 : 503

  res.status(status).json({
    success: true,
    data: {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
    },
  })
})

healthRouter.get('/full', async (_req, res) => {
  const checks: Record<string, string> = {}

  // Database
  try {
    const { error } = await adminSupabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
    checks.database = error ? 'error' : 'ok'
  } catch {
    checks.database = 'error'
  }

  // Shiprocket
  try {
    const token = await shiprocketAuthCheck()
    checks.shiprocket = token ? 'ok' : 'error'
  } catch {
    checks.shiprocket = 'error'
  }

  const allOk = Object.values(checks).every((s) => s === 'ok')
  const status = allOk ? 200 : 503

  // Include metrics snapshot
  const metrics = getMetricsSnapshot()

  res.status(status).json({
    success: true,
    data: {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: checks,
      metrics: {
        uptime_seconds: metrics.server_uptime_seconds,
        memory_mb: metrics.memory_mb,
        shiprocket_calls: metrics.shiprocketApi.callsTotal,
        webhooks_received: metrics.webhook.received,
        orders_synced: metrics.sync.ordersSyncedTotal,
      },
    },
  })
})
