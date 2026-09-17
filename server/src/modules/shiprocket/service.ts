import { createHash } from 'crypto'
import { adminSupabase } from '../../lib/supabase/admin'
import { logger } from '../../lib/logger'
import { writeTrackingSnapshot } from '../../services/trackingAnalytics'
import { mapShiprocketStatusToOrderStatus, transitionOrderStatus } from '../orders/service'
import { isValidTransition } from '../orders/stateMachine'
import { executionLeaseRpcArgs, type ExecutionLease } from '../../services/executionLease'

export interface ProcessWebhookResult {
  status: 'processed' | 'ignored'
  orderId?: string
}

interface ShiprocketScan {
  date?: string
  activity?: string
  location?: string
}

interface ParsedWebhook {
  awbCode: string | null
  courierName: string | null
  currentStatus: string
  eventTime: string
  location: string | null
  remarks: string | null
  shipmentId: string | null
  shiprocketOrderId: string | null
  merchantOrderId: string | null
  trackingUrl: string | null
  vendorEventId: string
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : null
}

function parseVendorTimestamp(value: unknown): string {
  const raw = optionalString(value)
  if (!raw) return new Date().toISOString()

  const dayFirst = raw.match(/^(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (dayFirst) {
    const [, day, month, year, hour, minute, second] = dayFirst
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`).toISOString()
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function parseShiprocketWebhookPayload(payload: Record<string, unknown>): ParsedWebhook {
  const currentStatus = optionalString(payload['current_status'])
  if (!currentStatus) throw new Error('Shiprocket webhook is missing current_status')

  const scans = Array.isArray(payload['scans']) ? (payload['scans'] as ShiprocketScan[]) : []
  const latestScan = scans.at(-1)
  const eventTime = parseVendorTimestamp(payload['current_timestamp'] ?? latestScan?.date)
  const awbCode = optionalString(payload['awb'])
  const shiprocketOrderId = optionalString(payload['sr_order_id'])
  const merchantOrderId = optionalString(payload['order_id'])
  const identity = [
    awbCode ?? 'no-awb',
    currentStatus.toLowerCase(),
    eventTime,
    shiprocketOrderId ?? merchantOrderId ?? 'no-order',
  ].join('|')

  return {
    awbCode,
    courierName: optionalString(payload['courier_name']),
    currentStatus,
    eventTime,
    location: optionalString(payload['location']) ?? optionalString(latestScan?.location),
    remarks: optionalString(payload['remarks']) ?? optionalString(latestScan?.activity),
    shipmentId: optionalString(payload['shipment_id']),
    shiprocketOrderId,
    merchantOrderId,
    trackingUrl: optionalString(payload['track_url']),
    vendorEventId: createHash('sha256').update(identity).digest('hex'),
  }
}

async function findOrder(event: ParsedWebhook): Promise<{
  id: string
  status: string
  user_id: string
} | null> {
  const lookups: Array<{ column: string; value: string | null }> = [
    { column: 'awb_code', value: event.awbCode },
    { column: 'shipment_id', value: event.shipmentId },
    { column: 'shiprocket_order_id', value: event.shiprocketOrderId },
    { column: 'order_number', value: event.merchantOrderId },
  ]

  for (const lookup of lookups) {
    if (!lookup.value) continue
    const { data, error } = await adminSupabase
      .from('orders')
      .select('id, status, user_id')
      .eq(lookup.column, lookup.value)
      .maybeSingle()

    if (error) throw new Error(`Failed to match Shiprocket order: ${error.message}`)
    if (data) return data
  }

  return null
}

async function persistShipmentIdentity(
  orderId: string,
  event: ParsedWebhook,
  executionLease?: ExecutionLease
): Promise<void> {
  const update: Record<string, unknown> = { shiprocket_status: event.currentStatus }
  if (event.awbCode) update['awb_code'] = event.awbCode
  if (event.shipmentId) update['shipment_id'] = event.shipmentId
  if (event.shiprocketOrderId) update['shiprocket_order_id'] = event.shiprocketOrderId
  if (event.courierName) update['courier_name'] = event.courierName
  if (event.trackingUrl) update['tracking_url'] = event.trackingUrl

  const result = executionLease
    ? await adminSupabase.rpc('apply_shiprocket_persistence_fenced', {
        ...executionLeaseRpcArgs(executionLease),
        p_order_id: orderId,
        p_persistence: update,
      })
    : await adminSupabase.from('orders').update(update).eq('id', orderId).select('id').single()
  const { data, error } = result

  if (error || !data) {
    throw new Error(`Failed to persist Shiprocket identifiers: ${error?.message ?? 'missing row'}`)
  }
}

async function persistShipmentEvent(
  orderId: string,
  event: ParsedWebhook,
  payload: Record<string, unknown>,
  executionLease?: ExecutionLease
): Promise<void> {
  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const { error } = executionLease
    ? await adminSupabase.rpc('persist_shipment_event_fenced', {
        ...executionLeaseRpcArgs(executionLease),
        p_order_id: orderId,
        p_shipment_id: event.shipmentId,
        p_status: event.currentStatus,
        p_location: event.location,
        p_remarks: event.remarks,
        p_event_time: event.eventTime,
        p_raw_payload: payload,
        p_payload_hash: payloadHash,
        p_vendor_event_id: event.vendorEventId,
      })
    : await adminSupabase.from('shipment_events').insert({
        order_id: orderId,
        shipment_id: event.shipmentId,
        status: event.currentStatus,
        location: event.location,
        remarks: event.remarks,
        event_time: event.eventTime,
        raw_payload: payload,
        payload_hash: payloadHash,
        vendor_event_id: event.vendorEventId,
      })

  if (error && error.code !== '23505') {
    throw new Error(`Failed to persist shipment event: ${error.message}`)
  }
}

export async function processShiprocketWebhook(
  payload: Record<string, unknown>,
  executionLease?: ExecutionLease
): Promise<ProcessWebhookResult> {
  const event = parseShiprocketWebhookPayload(payload)
  const order = await findOrder(event)

  if (!order) {
    logger.warn(
      {
        awb: event.awbCode,
        shipmentId: event.shipmentId,
        shiprocketOrderId: event.shiprocketOrderId,
        merchantOrderId: event.merchantOrderId,
      },
      'Shiprocket webhook has no matching order'
    )
    return { status: 'ignored' }
  }

  await persistShipmentIdentity(order.id, event, executionLease)
  await persistShipmentEvent(order.id, event, payload, executionLease)

  const targetStatus = mapShiprocketStatusToOrderStatus(event.currentStatus)
  if (
    targetStatus &&
    targetStatus !== order.status &&
    isValidTransition(order.status, targetStatus)
  ) {
    await transitionOrderStatus(
      order,
      targetStatus,
      'webhook',
      {
        awbCode: event.awbCode,
        courierName: event.courierName,
        vendorEventId: event.vendorEventId,
      },
      executionLease
    )
  } else if (targetStatus && targetStatus !== order.status) {
    logger.warn(
      { orderId: order.id, currentStatus: order.status, targetStatus },
      'Shiprocket webhook retained an out-of-sequence status'
    )
  } else if (!targetStatus) {
    logger.warn(
      { orderId: order.id, shiprocketStatus: event.currentStatus },
      'Shiprocket webhook status is not mapped; raw event retained'
    )
  }

  await writeTrackingSnapshot(
    {
      orderId: order.id,
      awbCode: event.awbCode,
      shipmentId: event.shipmentId,
      currentStatus: event.currentStatus,
      location: event.location,
      courierName: event.courierName,
      origin: null,
      destination: null,
      edd: optionalString(payload['etd']),
      pickupDate: optionalString(payload['pickup_scheduled_date']),
      deliveredDate: targetStatus === 'delivered' ? event.eventTime : null,
      trackingRaw: payload,
      syncSource: 'webhook',
    },
    executionLease
  )

  logger.info(
    { orderId: order.id, currentStatus: event.currentStatus },
    'Shiprocket webhook processed'
  )
  return { status: 'processed', orderId: order.id }
}
