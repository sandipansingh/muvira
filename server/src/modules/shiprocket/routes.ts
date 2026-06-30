import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { ServiceabilitySchema, ShiprocketSettingsUpdateSchema } from './schema'
import * as controller from './controller'

export const shiprocketWebhookRouter = Router()

shiprocketWebhookRouter.post('/', controller.handleWebhook)

// Admin Shiprocket config - requireAdmin is applied at parent level
export const adminShiprocketRouter = Router()

adminShiprocketRouter.get('/pickup-locations', controller.adminGetPickupLocations)
adminShiprocketRouter.post(
  '/check-serviceability',
  validate({ body: ServiceabilitySchema }),
  controller.adminCheckServiceability
)
adminShiprocketRouter.get('/settings', controller.adminGetShiprocketSettings)
adminShiprocketRouter.patch(
  '/settings',
  validate({ body: ShiprocketSettingsUpdateSchema }),
  controller.adminUpdateShiprocketSettings
)
