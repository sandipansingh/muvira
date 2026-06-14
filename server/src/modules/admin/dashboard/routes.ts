import { Router } from 'express'
import { validate } from '../../../middleware/validate'
import { DashboardStatsQuerySchema } from './schema'
import * as controller from './controller'

export const adminDashboardRouter = Router()

adminDashboardRouter.get(
  '/stats',
  validate({ query: DashboardStatsQuerySchema }),
  controller.getDashboardStats
)
