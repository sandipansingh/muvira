import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { requireAuth } from '../../middleware/requireAuth'
import { UpdateProfileSchema } from './schema'
import * as controller from './controller'

export const profileRouter = Router()

profileRouter.use(requireAuth)

profileRouter.get('/', controller.getProfile)
profileRouter.patch('/', validate({ body: UpdateProfileSchema }), controller.updateProfile)
