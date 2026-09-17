import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { executionLeaseRpcArgs, type ExecutionLease } from './executionLease'

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
export async function writeTrackingSnapshot(
  params: {
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
  },
  executionLease?: ExecutionLease
): Promise<void> {
  if (!params.awbCode) {
    logger.warn({ orderId: params.orderId }, 'Skipped tracking snapshot without an AWB code')
    return
  }

  try {
    const values = {
      order_id: params.orderId,
      awb_code: params.awbCode,
      shipment_id: params.shipmentId,
      courier_name: params.courierName,
      current_status: params.currentStatus,
      origin: params.origin,
      destination: params.destination,
      estimated_delivery_date: params.edd ? new Date(params.edd).toISOString().split('T')[0] : null,
      pickup_date: params.pickupDate ? new Date(params.pickupDate).toISOString() : null,
      delivered_date: params.deliveredDate ? new Date(params.deliveredDate).toISOString() : null,
      tracking_raw: params.trackingRaw,
      sync_source: params.syncSource,
    }
    const { error } = executionLease
      ? await adminSupabase.rpc('write_tracking_snapshot_fenced', {
          ...executionLeaseRpcArgs(executionLease),
          p_order_id: values.order_id,
          p_awb_code: values.awb_code,
          p_shipment_id: values.shipment_id,
          p_courier_name: values.courier_name,
          p_current_status: values.current_status,
          p_origin: values.origin,
          p_destination: values.destination,
          p_estimated_delivery_date: values.estimated_delivery_date,
          p_pickup_date: values.pickup_date,
          p_delivered_date: values.delivered_date,
          p_tracking_raw: values.tracking_raw,
          p_sync_source: values.sync_source,
        })
      : await adminSupabase.from('tracking_snapshots').insert(values)
    if (error) throw error
  } catch (err) {
    logger.warn({ err, orderId: params.orderId }, 'Failed to write tracking snapshot')
  }
}
