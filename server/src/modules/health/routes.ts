import { Router } from 'express'
import { adminSupabase } from '../../lib/supabase/admin'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  // Quick DB connectivity check
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
