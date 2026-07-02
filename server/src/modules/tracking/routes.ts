import { Router } from 'express'
import { trackByAwb, trackBulkByAwb } from './controller'

export const trackingRouter = Router()

// Public — reads from OUR database only (never calls Shiprocket API)
trackingRouter.get('/:awb', trackByAwb)
trackingRouter.post('/bulk', trackBulkByAwb)
