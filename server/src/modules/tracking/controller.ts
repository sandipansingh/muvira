import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../types'
import { adminSupabase } from '../../lib/supabase/admin'

/**
 * DB-backed tracking endpoints.
 *
 * ALL tracking data is read from our own database — NEVER from Shiprocket API.
 * Shiprocket tracking sync happens via webhooks (primary) and cron polling (fallback),
 * both of which write to our DB tables.
 */

/**
 * GET /api/tracking/:awb
 *
 * Returns tracking data for a single AWB from our DB.
 * Matches the ShiprocketTrackData shape so the client component works unchanged.
 */
export async function trackByAwb(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const awb = req.params['awb'] as string
    if (!awb || awb.trim() === '') {
      throw new AppError(400, 'MISSING_AWB', 'AWB code is required')
    }

    const data = await buildTrackingData(awb.trim())
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/tracking/bulk
 *
 * Returns tracking data for multiple AWBs from our DB.
 */
export async function trackBulkByAwb(
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
      .slice(0, 50)

    const result: Record<string, unknown> = {}
    for (const awb of validAwbs) {
      try {
        result[awb] = await buildTrackingData(awb)
      } catch {
        result[awb] = {
          tracking_data: {
            track_status: 0,
            shipment_status: 0,
            shipment_track: [],
            shipment_track_activities: [],
            track_url: '',
          },
        }
      }
    }

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Build Shiprocket-compatible tracking data from our DB.
 * Reads from orders (for current status/metadata) and shipment_events (for timeline).
 */
async function buildTrackingData(awbCode: string): Promise<{
  tracking_data: {
    track_status: number
    shipment_status: number
    shipment_track: Array<Record<string, unknown>>
    shipment_track_activities: Array<Record<string, unknown>>
    track_url: string
    etd?: string
  }
}> {
  // Look up order by AWB
  const { data: order } = await adminSupabase
    .from('orders')
    .select(
      'id, awb_code, courier_name, shiprocket_order_id, shipment_id, tracking_url, status, order_number'
    )
    .eq('awb_code', awbCode)
    .maybeSingle()

  if (!order) {
    return {
      tracking_data: {
        track_status: 0,
        shipment_status: 0,
        shipment_track: [],
        shipment_track_activities: [],
        track_url: '',
      },
    }
  }

  // Fetch shipment events for timeline
  const { data: events } = await adminSupabase
    .from('shipment_events')
    .select('status, location, remarks, event_time, raw_payload')
    .eq('order_id', order.id)
    .order('event_time', { ascending: false })

  // Build activities array matching Shiprocket shape
  const activities = (events ?? []).map((evt) => {
    const payload = (evt.raw_payload as Record<string, unknown> | null) ?? {}
    return {
      date: evt.event_time,
      status: evt.status,
      activity: (evt.remarks as string) ?? (evt.status),
      location: evt.location ?? '',
      'sr-status': payload['sr-status'] ?? evt.status,
      'sr-status-label': payload['sr-status-label'] ?? evt.status,
    }
  })

  // Build shipment_track entry
  const shipmentTrack = {
    id: Number(order.shiprocket_order_id) || 0,
    awb_code: order.awb_code,
    courier_company_id: 0,
    shipment_id: order.shipment_id ? Number(order.shipment_id) : null,
    order_id: Number(order.shiprocket_order_id) || 0,
    pickup_date: null,
    delivered_date: null,
    weight: '',
    packages: 1,
    current_status: order.status,
    delivered_to: '',
    destination: '',
    consignee_name: '',
    origin: '',
    courier_name: order.courier_name ?? null,
    edd: null,
  }

  return {
    tracking_data: {
      track_status: 1,
      shipment_status: 1,
      shipment_track: [shipmentTrack],
      shipment_track_activities: activities,
      track_url: (order.tracking_url as string) ?? '',
    },
  }
}
