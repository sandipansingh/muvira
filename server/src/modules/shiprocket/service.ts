import { adminSupabase } from '../../lib/supabase/admin'
import { logger } from '../../lib/logger'
import { createHash } from 'crypto'
import { updateOrderStatusByAwb, mapShiprocketStatusToOrderStatus } from '../orders/service'
import { writeTrackingSnapshot } from '../../services/trackingAnalytics'

export interface ProcessWebhookResult {
  status: 'processed' | 'ignored'
  orderId?: string
}

/**
 * Process an already-authenticated, already-deduped Shiprocket webhook payload.
 *
 * Idempotency notes:
 * - Called only AFTER the controller has verified the payload is not a duplicate
 * - shipment_events insert is NOT idempotent at the DB level, but the controller
 *   guards against duplicate payloads, so this is effectively safe
 * - Multiple webhooks with different payloads for the same event (e.g. successive
 *   status updates) are expected and will each INSERT a new event row — this is
 *   correct behavior (each represents a distinct shipment scan)
 */
export async function processShiprocketWebhook(
  payload: Record<string, unknown>
): Promise<ProcessWebhookResult> {
  const event = payload['event'] as string | undefined
  const shipmentId = payload['shipment_id'] as number | undefined
  const awbCode = payload['awb'] as string | undefined
  const currentStatus = payload['current_status'] as string | undefined
  const location = payload['location'] as string | undefined
  const remarks = payload['remarks'] as string | undefined
  const orderId = payload['order_id'] as number | undefined

  logger.info({ event, shipmentId, awbCode, currentStatus, orderId }, 'Shiprocket webhook received')

  let dbOrderId: string | null = null

  // Match by AWB code (primary)
  if (awbCode) {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, status')
      .eq('awb_code', awbCode)
      .maybeSingle()

    if (order) {
      dbOrderId = order.id
    }
  }

  // Fallback: match by shipment_id
  if (!dbOrderId && shipmentId) {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, status')
      .eq('shipment_id', String(shipmentId))
      .maybeSingle()

    if (order) {
      dbOrderId = order.id
    }
  }

  // Fallback: match by Shiprocket order_id
  if (!dbOrderId && orderId) {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, status')
      .eq('shiprocket_order_id', String(orderId))
      .maybeSingle()

    if (order) {
      dbOrderId = order.id
    }
  }

  if (!dbOrderId) {
    logger.warn(
      { event, shipmentId, awbCode, orderId },
      'Shiprocket webhook: no matching order found'
    )
    return { status: 'ignored' }
  }

  // Save shipment event for customer-facing timeline display
  const eventPayloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')

  await adminSupabase.from('shipment_events').insert({
    order_id: dbOrderId,
    shipment_id: shipmentId != null ? String(shipmentId) : null,
    status: currentStatus ?? event ?? 'unknown',
    location: location ?? null,
    remarks: remarks ?? null,
    event_time: new Date().toISOString(),
    raw_payload: payload,
    payload_hash: eventPayloadHash,
  })

  // Write tracking snapshot for analytics (fire-and-forget)
  writeTrackingSnapshot({
    orderId: dbOrderId,
    awbCode: awbCode ?? null,
    shipmentId: shipmentId != null ? String(shipmentId) : null,
    currentStatus: currentStatus ?? '',
    location: location ?? null,
    courierName: null,
    origin: null,
    destination: null,
    edd: null,
    pickupDate: null,
    deliveredDate: null,
    trackingRaw: payload,
    syncSource: 'webhook',
  }).catch(() => {})

  // Update order status if tracking info is provided
  if (awbCode && currentStatus) {
    const targetStatus = mapShiprocketStatusToOrderStatus(currentStatus)
    if (targetStatus) {
      await updateOrderStatusByAwb(awbCode, targetStatus, 'webhook')
    }
  }

  // If AWB is newly assigned via webhook, save it
  if (awbCode && shipmentId) {
    await adminSupabase
      .from('orders')
      .update({
        awb_code: awbCode,
        shipment_id: String(shipmentId),
      })
      .eq('id', dbOrderId)
  }

  // If a tracking URL was provided, save it
  const trackUrl = payload['track_url'] as string | undefined
  if (trackUrl) {
    await adminSupabase.from('orders').update({ tracking_url: trackUrl }).eq('id', dbOrderId)
  }

  logger.info({ dbOrderId, event, currentStatus }, 'Shiprocket webhook processed')

  return { status: 'processed', orderId: dbOrderId }
}
