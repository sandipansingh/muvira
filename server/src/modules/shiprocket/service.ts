import { adminSupabase } from '../../lib/supabase/admin'
import { logger } from '../../lib/logger'
import { updateOrderStatusByAwb, mapShiprocketStatusToOrderStatus } from '../orders/service'

export async function processShiprocketWebhook(
  payload: Record<string, unknown>
): Promise<{ status: 'processed' | 'ignored' }> {
  const event = payload['event'] as string | undefined
  const shipmentId = payload['shipment_id'] as number | undefined
  const awbCode = payload['awb'] as string | undefined
  const currentStatus = payload['current_status'] as string | undefined
  const location = payload['location'] as string | undefined
  const remarks = payload['remarks'] as string | undefined
  const orderId = payload['order_id'] as number | undefined

  logger.info(
    { event, shipmentId, awbCode, currentStatus, orderId },
    'Shiprocket webhook received'
  )

  // Find the matching order in our DB
  let dbOrderId: string | null = null

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

  // Save shipment event
  await adminSupabase.from('shipment_events').insert({
    order_id: dbOrderId,
    shipment_id: shipmentId != null ? String(shipmentId) : null,
    status: currentStatus ?? event ?? 'unknown',
    location: location ?? null,
    remarks: remarks ?? null,
    event_time: new Date().toISOString(),
    raw_payload: payload,
  })

  // Update order status if we have tracking info
  if (awbCode && currentStatus) {
    const targetStatus = mapShiprocketStatusToOrderStatus(currentStatus)
    if (targetStatus) {
      await updateOrderStatusByAwb(awbCode, targetStatus)
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
    await adminSupabase
      .from('orders')
      .update({ tracking_url: trackUrl })
      .eq('id', dbOrderId)
  }

  logger.info(
    { dbOrderId, event, currentStatus },
    'Shiprocket webhook processed'
  )

  return { status: 'processed' }
}
