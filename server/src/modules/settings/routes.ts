import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { UpdateSettingsSchema } from './schema'
import * as controller from './controller'

export const settingsRouter = Router()
settingsRouter.get('/', controller.getSettings)

export const adminSettingsRouter = Router()
adminSettingsRouter.get('/', controller.getSettings)
adminSettingsRouter.patch(
  '/',
  validate({ body: UpdateSettingsSchema }),
  controller.adminUpdateSettings
)
