import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import { UpdateNotificationPrefsSchema, NotificationLogsQuerySchema } from './schema'
import * as controller from './controller'

// User routes
export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)
notificationsRouter.get('/preferences', controller.getPreferences)
notificationsRouter.put(
  '/preferences',
  validate({ body: UpdateNotificationPrefsSchema }),
  controller.updatePreferences
)

// Admin routes — requireAdmin is applied at parent level
export const adminNotificationsRouter = Router()
adminNotificationsRouter.get(
  '/logs',
  validate({ query: NotificationLogsQuerySchema }),
  controller.adminListNotificationLogs
)
