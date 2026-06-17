import type { Request, Response, NextFunction } from 'express'
import { trackSingle, trackBulk } from '../../services/shiprocket'
import { AppError } from '../../types'
import { logger } from '../../lib/logger'
import { updateOrderStatusByAwb, mapShiprocketStatusToOrderStatus } from '../orders/service'

export async function proxyTrackSingle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const awb = req.params['awb'] as string
    if (!awb || awb.trim() === '') {
      throw new AppError(400, 'MISSING_AWB', 'AWB code is required')
    }
    const data = await trackSingle(awb.trim())

    // Auto-update order status based on Shiprocket status
    try {
      const trackingInfo = data?.tracking_data?.shipment_track?.[0]
      if (trackingInfo) {
        const srStatus = trackingInfo.current_status
        const targetStatus = mapShiprocketStatusToOrderStatus(srStatus)
        if (targetStatus) {
          await updateOrderStatusByAwb(awb.trim(), targetStatus)
        }
      }
    } catch (e) {
      logger.error(`Failed to auto-update order status for AWB ${awb}:`, e)
    }

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function proxyTrackBulk(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { awbs } = req.body as { awbs?: unknown }
    if (!Array.isArray(awbs) || awbs.length === 0) {
      throw new AppError(400, 'MISSING_AWBS', 'awbs array is required')
    }
    const validAwbs = awbs
      .filter((a): a is string => typeof a === 'string' && a.trim() !== '')
      .slice(0, 50) // Hard cap - Shiprocket may have its own limit

    const data = await trackBulk(validAwbs)

    // Auto-update order statuses in bulk based on Shiprocket statuses
    try {
      for (const awb of validAwbs) {
        const item = data[awb]
        const trackingInfo = item?.tracking_data?.shipment_track?.[0]
        if (trackingInfo) {
          const srStatus = trackingInfo.current_status
          const targetStatus = mapShiprocketStatusToOrderStatus(srStatus)
          if (targetStatus) {
            await updateOrderStatusByAwb(awb.trim(), targetStatus)
          }
        }
      }
    } catch (e) {
      logger.error('Failed to auto-update order statuses in bulk:', e)
    }

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
