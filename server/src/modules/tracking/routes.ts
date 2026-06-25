import { Router } from 'express'
import { proxyTrackSingle, proxyTrackBulk } from './controller'

export const trackingRouter = Router()

// Public — no auth required; Shiprocket credentials never reach the client
trackingRouter.get('/:awb', proxyTrackSingle)
trackingRouter.post('/bulk', proxyTrackBulk)
