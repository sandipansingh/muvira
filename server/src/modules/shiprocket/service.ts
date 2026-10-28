import { createHash } from 'crypto'
import { invalidateOn } from '../../services/cacheInvalidation'
import { emitStatusChangeEvents } from '../../services/eventBus'
import { adminSupabase } from '../../lib/supabase/admin'
import { databaseError } from '../../lib/databaseError'
import { shiprocketStatusToOrderStatus } from '../orders/stateMachine'
import {
  executionLeaseRpcArgs,
  withExecutionLease,
  type ExecutionLease,
} from '../../services/executionLease'
import type { ShiprocketTrackData } from '../../services/shiprocket'

export interface ProcessWebhookResult {
  status: 'processed' | 'ignored'
  orderId?: string
  applied?: boolean
}
function optionalString(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim() || null
    : null
}

export function parseVendorTimestamp(value: unknown): string | null {
  const raw = optionalString(value)
  if (!raw) return null
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})(?:$|[ T])/)
  if (isoDate) {
    const calendar = new Date(`${isoDate[1]}T00:00:00Z`)
    if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== isoDate[1])
      return null
  }
  const dayFirst = raw.match(/^(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!dayFirst && !isoDate) return null
  let normalized = raw
  if (dayFirst) {
    const [, day, month, year, hour, minute, second] = dayFirst
    normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
    const check = new Date(normalized)
    if (
      Number.isNaN(check.getTime()) ||
      new Date(check.getTime() + 330 * 60000).toISOString().slice(0, 19) !==
        `${year}-${month}-${day}T${hour}:${minute}:${second}`
    )
      return null
  } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw))
    normalized = raw.replace(' ', 'T') + '+05:30'
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function parseShiprocketWebhookPayload(payload: Record<string, unknown>) {
  const currentStatus = optionalString(payload['current_status'])
  if (!currentStatus) throw new Error('Shiprocket webhook is missing current_status')
  const scans = Array.isArray(payload['scans'])
    ? payload['scans'].filter(
        (row): row is Record<string, unknown> => !!row && typeof row === 'object'
      )
    : []
  const latest = [...scans].sort((a, b) =>
    (parseVendorTimestamp(b['date']) ?? '').localeCompare(parseVendorTimestamp(a['date']) ?? '')
  )[0]
  const eventTime = parseVendorTimestamp(payload['current_timestamp'] ?? latest?.['date'])
  const awbCode = optionalString(payload['awb'])
  const shipmentId = optionalString(payload['shipment_id'])
  const shiprocketOrderId = optionalString(payload['sr_order_id'])
  const merchantOrderId = optionalString(payload['order_id'])
  const identity = [
    awbCode,
    shipmentId,
    shiprocketOrderId,
    merchantOrderId,
    currentStatus.toLowerCase(),
    eventTime,
  ].join('|')
  const trackingUrl = optionalString(payload['track_url'])
  return {
    awbCode,
    shipmentId,
    shiprocketOrderId,
    merchantOrderId,
    currentStatus,
    eventTime,
    courierName: optionalString(payload['courier_name']),
    location: optionalString(payload['location']) ?? optionalString(latest?.['location']),
    remarks: optionalString(payload['remarks']) ?? optionalString(latest?.['activity']),
    origin: optionalString(payload['origin']),
    destination: optionalString(payload['destination']),
    estimatedDeliveryDate: parseVendorTimestamp(payload['etd'])?.slice(0, 10) ?? null,
    pickupDate: parseVendorTimestamp(payload['pickup_date']),
    deliveredDate: parseVendorTimestamp(payload['delivered_date']),
    trackingUrl: trackingUrl?.startsWith('https://') ? trackingUrl : null,
    vendorEventId: createHash('sha256').update(identity).digest('hex'),
    events: scans.map((scan) => ({
      currentStatus:
        optionalString(scan['sr-status-label']) ?? optionalString(scan['activity']) ?? 'Scan',
      eventTime: parseVendorTimestamp(scan['date']),
      location: optionalString(scan['location']),
      remarks: optionalString(scan['activity']),
      vendorEventId: createHash('sha256').update(JSON.stringify(scan)).digest('hex'),
    })),
  }
}

export async function processShiprocketWebhook(
  payload: Record<string, unknown>,
  executionLease?: ExecutionLease,
  source: 'webhook' | 'cron_poll' | 'manual' = 'webhook'
): Promise<ProcessWebhookResult> {
  const event = parseShiprocketWebhookPayload(payload)
  const matches = new Set<string>()
  for (const [column, value] of Object.entries({
    awb_code: event.awbCode,
    shipment_id: event.shipmentId,
    shiprocket_order_id: event.shiprocketOrderId,
    order_number: event.merchantOrderId,
  })) {
    if (!value) continue
    const { data, error } = await adminSupabase
      .from('orders')
      .select('id')
      .eq(column, value)
      .maybeSingle()
    if (error)
      throw databaseError('shipping.match_observation', error, 'Shipment matching unavailable')
    if (data) matches.add(data.id as string)
  }
  if (!matches.size) return { status: 'ignored' }
  if (matches.size > 1) throw new Error('Shiprocket observation identifiers match different orders')
  const orderId = [...matches][0]!
  if (!executionLease)
    return withExecutionLease('shipping_observation', orderId, ({ lease }) =>
      processShiprocketWebhook(payload, lease, source)
    )
  const { data, error } = await adminSupabase.rpc('apply_shipping_observation', {
    ...executionLeaseRpcArgs(executionLease),
    p_order_id: orderId,
    p_observation: event,
    p_target_status: shiprocketStatusToOrderStatus(event.currentStatus),
    p_source: source,
  })
  if (error || !data)
    throw databaseError(
      'shipping.apply_observation',
      error,
      'Shipment observation could not be applied'
    )
  const result = data as {
    applied: boolean
    oldStatus: string
    newStatus: string
    userId: string
    orderNumber: string
  }
  if (result.applied) {
    invalidateOn('ORDER_UPDATED', { id: orderId, userId: result.userId })
    if (result.newStatus !== result.oldStatus)
      emitStatusChangeEvents({
        orderId,
        userId: result.userId,
        orderNumber: result.orderNumber,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus,
        source: source === 'webhook' ? 'webhook' : 'polling_sync',
        awbCode: event.awbCode,
        courierName: event.courierName,
      })
  }
  return { status: 'processed', orderId, applied: result.applied }
}

export async function processTrackingResult(
  awb: string,
  tracking: ShiprocketTrackData,
  source: 'cron_poll' | 'manual',
  lease?: ExecutionLease
) {
  const track = tracking.shipment_track?.[0]
  if (!track?.current_status || track.awb_code !== awb)
    throw new Error('Shiprocket tracking identity or status is missing')
  const dates =
    tracking.shipment_track_activities
      ?.map((row) => parseVendorTimestamp(row.date))
      .filter((date): date is string => !!date) ?? []
  if (shiprocketStatusToOrderStatus(track.current_status) === 'delivered') {
    const delivered = parseVendorTimestamp(track.delivered_date)
    if (delivered) dates.push(delivered)
  }
  dates.sort()
  return processShiprocketWebhook(
    {
      awb: track.awb_code,
      shipment_id: track.shipment_id ?? track.id,
      sr_order_id: track.order_id,
      current_status: track.current_status,
      current_timestamp: dates.at(-1),
      courier_name: track.courier_name,
      origin: track.origin,
      destination: track.destination,
      etd: track.edd ?? tracking.etd,
      pickup_date: track.pickup_date,
      delivered_date: track.delivered_date,
      track_url: tracking.track_url,
      scans: tracking.shipment_track_activities ?? [],
    },
    lease,
    source
  )
}

export async function processStoredShiprocketWebhook(
  receiptId: string,
  lease: ExecutionLease
): Promise<void> {
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .select('raw_payload,processing_status,shipping_match_attempts')
    .eq('id', receiptId)
    .eq('source', 'shiprocket')
    .single()
  if (error || !data)
    throw databaseError('shipping.load_receipt', error, 'Shipment receipt unavailable')
  if (data.processing_status === 'processed') return
  if (data.shipping_match_attempts >= 10)
    throw new Error('Shipment receipt requires manual review after bounded rematching')
  let matched = false
  let processingError: unknown
  try {
    const result = await processShiprocketWebhook(
      data.raw_payload as Record<string, unknown>,
      lease
    )
    matched = result.status === 'processed'
  } catch (error) {
    processingError = error
  }
  {
    const finished = await adminSupabase.rpc('finish_shipping_receipt', {
      ...executionLeaseRpcArgs(lease),
      p_receipt_id: receiptId,
      p_matched: matched,
    })
    if (finished.error)
      throw databaseError(
        'shipping.finish_receipt',
        finished.error,
        'Receipt completion was fenced out'
      )
  }
  if (processingError) throw processingError
  if (!matched) throw new Error('No matching shipment generation; rematching required')
}

export async function recoverShippingReceipts(limit = 50): Promise<void> {
  const { data, error } = await adminSupabase
    .from('webhook_events')
    .select('payload_hash,raw_payload')
    .eq('source', 'shiprocket')
    .neq('processing_status', 'processed')
    .lt('shipping_match_attempts', 10)
    .order('created_at')
    .limit(limit)
  if (error)
    throw databaseError('shipping.recover_receipts', error, 'Unfinished receipts unavailable')
  for (const row of data ?? []) {
    const recovered = await adminSupabase.rpc('accept_shipping_webhook', {
      p_payload_hash: row.payload_hash,
      p_payload: row.raw_payload,
    })
    if (recovered.error)
      throw databaseError('shipping.requeue_receipt', recovered.error, 'Receipt recovery failed')
  }
}
