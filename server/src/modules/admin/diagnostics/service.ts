import { adminSupabase } from '../../../lib/supabase/admin'
import { databaseError } from '../../../lib/databaseError'
import { logger } from '../../../lib/logger'
import { trackSingle } from '../../../services/shiprocket'
import { shiprocketStatusToOrderStatus, isValidTransition } from '../../orders/stateMachine'
import { writeTrackingSnapshot } from '../../../services/trackingAnalytics'
import { transitionOrderStatus } from '../../orders/service'

// --- Shipment Health ---

export async function getShipmentHealth(): Promise<{
  health: Array<Record<string, unknown>>
  summary: { total_active: number; warning_count: number; danger_count: number }
}> {
  const { data, error } = await adminSupabase
    .from('shipment_health' as never)
    .select('*')
    .limit(100)

  if (error) {
    throw databaseError(
      'admin.diagnostics.shipment_health',
      error,
      'Shipment health is unavailable',
      {
        statusCode: 503,
        code: 'DIAGNOSTICS_UNAVAILABLE',
      }
    )
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return {
    health: rows,
    summary: {
      total_active: rows.length,
      warning_count: rows.filter((r) => (r['health_status'] as string)?.startsWith('warning'))
        .length,
      danger_count: rows.filter((r) => (r['health_status'] as string)?.startsWith('danger')).length,
    },
  }
}

// --- Sync Health ---

export async function getSyncHealth(): Promise<{
  lastFullSync: Record<string, unknown> | null
  lastOfdSync: Record<string, unknown> | null
  pendingOrders: number
  recentErrors: Array<Record<string, unknown>>
}> {
  const [fullSync, ofdSync, pendingOrders, recentErrors] = await Promise.all([
    adminSupabase
      .from('sync_jobs')
      .select('*')
      .eq('job_type', 'full_poll')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from('sync_jobs')
      .select('*')
      .eq('job_type', 'ofd_poll')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('awb_code', 'is', null)
      .not('status', 'in', '("delivered","cancelled","returned","refunded","lost","damaged")'),
    adminSupabase
      .from('sync_jobs')
      .select('started_at, status, orders_checked, orders_updated, errors')
      .eq('status', 'failed')
      .order('started_at', { ascending: false })
      .limit(5),
  ])

  const failed = [fullSync, ofdSync, pendingOrders, recentErrors].find((result) => result.error)
  if (failed?.error) {
    throw databaseError(
      'admin.diagnostics.sync_health',
      failed.error,
      'Sync health is unavailable',
      {
        statusCode: 503,
        code: 'DIAGNOSTICS_UNAVAILABLE',
      }
    )
  }

  return {
    lastFullSync: fullSync.data ?? null,
    lastOfdSync: ofdSync.data ?? null,
    pendingOrders: pendingOrders.count ?? 0,
    recentErrors: (recentErrors.data ?? []) as Array<Record<string, unknown>>,
  }
}

// --- Webhook Logs ---

export async function getWebhookLogs(params: {
  page: number
  limit: number
  source?: string
  status?: string
}): Promise<{
  logs: Array<Record<string, unknown>>
  total: number
}> {
  const offset = (params.page - 1) * params.limit

  let query = adminSupabase
    .from('webhook_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (params.source) query = query.eq('source', params.source)
  if (params.status) query = query.eq('processing_status', params.status)

  const { data, error, count } = await query
  if (error) throw error

  return {
    logs: (data ?? []) as Array<Record<string, unknown>>,
    total: count ?? 0,
  }
}

// --- Retry Queue ---

export async function getRetryQueue(params: {
  page: number
  limit: number
  status?: string
}): Promise<{
  jobs: Array<Record<string, unknown>>
  total: number
}> {
  const offset = (params.page - 1) * params.limit

  let query = adminSupabase
    .from('retry_jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (params.status) query = query.eq('status', params.status)

  const { data, error, count } = await query
  if (error) throw error

  return {
    jobs: (data ?? []) as Array<Record<string, unknown>>,
    total: count ?? 0,
  }
}

export async function retryJob(jobId: string): Promise<boolean> {
  const { data, error } = await adminSupabase.rpc('requeue_retry_job', {
    p_job_id: jobId,
  })

  return !error && data !== null
}

// --- Shiprocket Error Diagnostics ---

export async function getShiprocketErrors(params: { page: number; limit: number }): Promise<{
  errors: Array<Record<string, unknown>>
  total: number
}> {
  const offset = (params.page - 1) * params.limit

  const { data, error, count } = await adminSupabase
    .from('orders')
    .select('id, order_number, shiprocket_status, shiprocket_error, created_at, updated_at', {
      count: 'exact',
    })
    .eq('shiprocket_status', 'failed')
    .order('updated_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (error) throw error

  return {
    errors: (data ?? []) as Array<Record<string, unknown>>,
    total: count ?? 0,
  }
}

// --- Courier Performance ---

export async function getCourierPerformance(): Promise<
  Array<{
    courier_name: string
    total_shipments: number
    delivered: number
    rto_count: number
    avg_delivery_days: number | null
  }>
> {
  const { data, error } = await adminSupabase
    .from('tracking_snapshots')
    .select('courier_name, current_status, pickup_date, delivered_date')
    .not('courier_name', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(5000)

  if (error || !data) {
    throw databaseError(
      'admin.diagnostics.courier_performance',
      error,
      'Courier performance is unavailable',
      { statusCode: 503, code: 'DIAGNOSTICS_UNAVAILABLE' }
    )
  }

  const grouped = new Map<
    string,
    {
      total: number
      delivered: number
      rto: number
      deliveryDays: number[]
    }
  >()

  for (const row of data as Array<{
    courier_name: string
    current_status: string
    pickup_date: string | null
    delivered_date: string | null
  }>) {
    const courier = row.courier_name
    if (!grouped.has(courier)) {
      grouped.set(courier, { total: 0, delivered: 0, rto: 0, deliveryDays: [] })
    }
    const stats = grouped.get(courier)!

    stats.total++
    if (row.current_status === 'delivered') {
      stats.delivered++
      if (row.pickup_date && row.delivered_date) {
        const days =
          (new Date(row.delivered_date).getTime() - new Date(row.pickup_date).getTime()) /
          (1000 * 60 * 60 * 24)
        if (days > 0 && days < 90) stats.deliveryDays.push(days)
      }
    }
    if (row.current_status?.toLowerCase().includes('rto')) {
      stats.rto++
    }
  }

  return Array.from(grouped.entries())
    .map(([name, stats]) => ({
      courier_name: name,
      total_shipments: stats.total,
      delivered: stats.delivered,
      rto_count: stats.rto,
      avg_delivery_days:
        stats.deliveryDays.length > 0
          ? Math.round(
              (stats.deliveryDays.reduce((a, b) => a + b, 0) / stats.deliveryDays.length) * 10
            ) / 10
          : null,
    }))
    .sort((a, b) => b.total_shipments - a.total_shipments)
}

// --- Dashboard Summary (single endpoint aggregating everything) ---

export async function getDashboardSummary(): Promise<Record<string, unknown>> {
  const [
    ordersPending,
    activeShipments,
    failedOrders,
    pendingRetry,
    deadJobs,
    failedWebhooks,
    lastSync,
  ] = await Promise.all([
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['processing', 'shipped', 'out_for_delivery']),
    adminSupabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shiprocket_status', 'failed'),
    adminSupabase
      .from('retry_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    adminSupabase
      .from('retry_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead'),
    adminSupabase
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'failed'),
    adminSupabase
      .from('sync_jobs')
      .select('started_at, status')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const failed = [
    ordersPending,
    activeShipments,
    failedOrders,
    pendingRetry,
    deadJobs,
    failedWebhooks,
    lastSync,
  ].find((result) => result.error)
  if (failed?.error) {
    throw databaseError(
      'admin.diagnostics.summary',
      failed.error,
      'Diagnostic summary is unavailable',
      { statusCode: 503, code: 'DIAGNOSTICS_UNAVAILABLE' }
    )
  }

  return {
    orders_pending: ordersPending.count ?? 0,
    active_shipments: activeShipments.count ?? 0,
    failed_shiprocket_orders: failedOrders.count ?? 0,
    pending_retry_jobs: pendingRetry.count ?? 0,
    dead_retry_jobs: deadJobs.count ?? 0,
    failed_webhooks: failedWebhooks.count ?? 0,
    last_sync: lastSync.data ?? null,
  }
}

export async function getCommerceFailures(): Promise<Record<string, unknown>> {
  const [outbox, invoices, reconciliation, alerts] = await Promise.all([
    adminSupabase
      .from('outbox_events')
      .select('id, aggregate_id, event_type, attempts, last_error, updated_at')
      .eq('status', 'dead')
      .order('updated_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('invoice_records')
      .select('id, order_id, attempts, last_error, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('payment_reconciliation_cases')
      .select(
        'id, order_id, payment_id, razorpay_order_id, razorpay_payment_id, reason, status, updated_at'
      )
      .neq('status', 'resolved')
      .order('updated_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('operational_alerts')
      .select(
        'id, alert_type, severity, source, reference_id, order_id, webhook_event_id, message, details, status, occurrences, last_seen_at, updated_at'
      )
      .neq('status', 'resolved')
      .order('last_seen_at', { ascending: false })
      .limit(20),
  ])

  const failed = [outbox, invoices, reconciliation, alerts].find((result) => result.error)
  if (failed?.error) {
    throw databaseError(
      'admin.diagnostics.commerce_failures',
      failed.error,
      'Commerce failure queues are unavailable',
      { statusCode: 503, code: 'DIAGNOSTICS_UNAVAILABLE' }
    )
  }

  return {
    dead_outbox_events: outbox.data ?? [],
    failed_invoices: invoices.data ?? [],
    payment_reconciliation_cases: reconciliation.data ?? [],
    operational_alerts: alerts.data ?? [],
  }
}

/**
 * Emergency-only: refresh a single shipment from Shiprocket.
 * Calls Shiprocket API directly — use sparingly.
 * Audit-logged in order_status_history.
 */
export async function refreshSingleShipment(
  orderId: string
): Promise<{ updated: boolean; oldStatus: string; newStatus: string | null }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, awb_code, status, user_id, order_number, shipment_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || !order.awb_code) {
    throw Object.assign(new Error('Order not found or no AWB code'), { statusCode: 404 })
  }

  const trackResult = await trackSingle(order.awb_code)
  const shipmentTrack = trackResult.tracking_data?.shipment_track?.[0]
  if (!shipmentTrack) {
    return { updated: false, oldStatus: order.status, newStatus: null }
  }

  const srStatus = shipmentTrack.current_status
  const newStatus = shiprocketStatusToOrderStatus(srStatus)
  if (!newStatus || newStatus === order.status) {
    return { updated: false, oldStatus: order.status, newStatus }
  }

  if (!isValidTransition(order.status, newStatus)) {
    logger.warn(
      { orderId, from: order.status, to: newStatus },
      'Emergency refresh: blocked invalid transition'
    )
    return { updated: false, oldStatus: order.status, newStatus }
  }

  const oldStatus = order.status

  await transitionOrderStatus(order, newStatus, 'admin_manual', {
    awbCode: order.awb_code,
    courierName: shipmentTrack.courier_name ?? null,
  })

  // Write tracking snapshot
  writeTrackingSnapshot({
    orderId,
    awbCode: order.awb_code,
    shipmentId: ((order as Record<string, unknown>)['shipment_id'] as string | null) ?? null,
    courierName: shipmentTrack.courier_name ?? null,
    currentStatus: shipmentTrack.current_status,
    origin: shipmentTrack.origin ?? null,
    destination: shipmentTrack.destination ?? null,
    edd: shipmentTrack.edd ?? null,
    pickupDate: shipmentTrack.pickup_date ?? null,
    deliveredDate: shipmentTrack.delivered_date ?? null,
    trackingRaw: shipmentTrack as unknown as Record<string, unknown>,
    syncSource: 'manual',
  }).catch(() => {})

  logger.info(
    { orderId, awb: order.awb_code, oldStatus, newStatus },
    'Emergency shipment refresh completed'
  )

  return { updated: true, oldStatus, newStatus }
}
