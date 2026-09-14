import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'

/**
 * Write a tracking snapshot for analytics.
 *
 * Snapshots capture point-in-time tracking state for:
 *   - Delivery SLA monitoring
 *   - Courier performance analytics
 *   - Shipment health dashboards
 *   - Historical tracking queries
 *
 * Fire-and-forget: this function never throws.
 */
export async function writeTrackingSnapshot(params: {
  orderId: string
  awbCode: string | null
  shipmentId: string | null
  currentStatus: string
  courierName: string | null
  origin: string | null
  destination: string | null
  location?: string | null
  edd: string | null
  pickupDate: string | null
  deliveredDate: string | null
  trackingRaw: Record<string, unknown>
  syncSource: 'webhook' | 'cron_poll' | 'manual'
}): Promise<void> {
  if (!params.awbCode) {
    logger.warn({ orderId: params.orderId }, 'Skipped tracking snapshot without an AWB code')
    return
  }

  try {
    const { error } = await adminSupabase.from('tracking_snapshots').insert({
      order_id: params.orderId,
      awb_code: params.awbCode,
      shipment_id: params.shipmentId,
      courier_name: params.courierName,
      current_status: params.currentStatus,
      origin: params.origin,
      destination: params.destination,
      estimated_delivery_date: params.edd ? new Date(params.edd).toISOString().split('T')[0] : null,
      pickup_date: params.pickupDate ? new Date(params.pickupDate) : null,
      delivered_date: params.deliveredDate ? new Date(params.deliveredDate) : null,
      tracking_raw: params.trackingRaw,
      sync_source: params.syncSource,
    })
    if (error) throw error
  } catch (err) {
    logger.warn({ err, orderId: params.orderId }, 'Failed to write tracking snapshot')
  }
}
