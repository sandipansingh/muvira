import { hasSchemaCapability } from '../../../services/runtimeSchema'
import { getWorkerStartupStatus } from '../../../services/workerStartup'
import { CommerceKinds, type CommerceKind } from './schema'
import { adminSupabase } from '../../../lib/supabase/admin'
import { databaseError } from '../../../lib/databaseError'
import { trackSingle } from '../../../services/shiprocket'
import { resolveRetainedCheckout } from '../../checkout/service'
import {
  auditProviderAction,
  reconcileProviderOperation,
} from '../../../services/providerOperations'

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
    .order('id', { ascending: false })
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
    .order('id', { ascending: false })
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
    .order('id', { ascending: false })
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

  const modern = await hasSchemaCapability(51)
  let overdueWatches = 0,
    cancellationRefunds = 0
  if (modern) {
    const [watches, refunds] = await Promise.all([
      adminSupabase
        .from('late_capture_watches')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'manual_review'])
        .lt('next_check_at', new Date().toISOString()),
      adminSupabase
        .from('retry_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'cancellation_refund')
        .neq('status', 'completed'),
    ])
    if (watches.error || refunds.error)
      throw databaseError(
        'admin.diagnostics.recovery',
        watches.error ?? refunds.error,
        'Recovery diagnostics are unavailable'
      )
    overdueWatches = watches.count ?? 0
    cancellationRefunds = refunds.count ?? 0
  }
  return {
    worker_state: getWorkerStartupStatus(),
    overdue_late_capture_watches: overdueWatches,
    pending_cancellation_refunds: cancellationRefunds,
    orders_pending: ordersPending.count ?? 0,
    active_shipments: activeShipments.count ?? 0,
    failed_shiprocket_orders: failedOrders.count ?? 0,
    pending_retry_jobs: pendingRetry.count ?? 0,
    dead_retry_jobs: deadJobs.count ?? 0,
    failed_webhooks: failedWebhooks.count ?? 0,
    last_sync: lastSync.data ?? null,
  }
}

const commerceSources = {
  outbox: {
    table: 'outbox_events',
    key: 'dead_outbox_events',
    fields: 'id,aggregate_id,event_type,attempts,last_error,updated_at',
  },
  invoice: {
    table: 'invoice_records',
    key: 'failed_invoices',
    fields: 'id,order_id,attempts,last_error,updated_at',
  },
  payment_reconciliation: {
    table: 'payment_reconciliation_cases',
    key: 'payment_reconciliation_cases',
    fields: 'id,order_id,payment_id,reason,status,updated_at',
  },
  operational_alert: {
    table: 'operational_alerts',
    key: 'operational_alerts',
    fields: 'id,alert_type,severity,order_id,message,status,occurrences,last_seen_at,updated_at',
  },
  provider_operation: {
    table: 'provider_operations',
    key: 'provider_operations',
    fields:
      'id,provider,operation_type,business_key,order_id,provider_target_type,provider_target_id,amount_paisa,currency,state,provider_status,error_classification,manual_review_reason,dispatch_attempts,reconciliation_attempts,last_reconciled_at,local_applied_at,updated_at',
  },
  retained_checkout: {
    table: 'retained_checkout_cases',
    key: 'retained_checkout_cases',
    fields:
      'order_id,state,escalation,retention_deadline_at,extension_count,last_provider_status,last_provider_amount_paid,last_provider_currency,last_verified_at,updated_at',
  },
  late_capture_watch: {
    table: 'late_capture_watches',
    key: 'late_capture_watches',
    fields:
      'id,order_id,razorpay_order_id,expected_amount_paisa,currency,status,last_provider_status,last_checked_at,updated_at',
  },
  cancellation_refund: {
    table: 'retry_jobs',
    key: 'cancellation_refunds',
    fields: 'id,reference_id,payload,status,last_error,next_retry_at,created_at,updated_at',
  },
} as const

export async function getCommerceFailurePage(params: {
  kind: CommerceKind
  page: number
  limit: number
}) {
  const source = commerceSources[params.kind]
  const modern = await hasSchemaCapability(51)
  if (params.kind === 'cancellation_refund' && !modern)
    return { rows: [], total: 0, key: source.key }
  const fields =
    source.fields +
    (params.kind === 'late_capture_watch' && modern
      ? ',next_check_at,check_attempts,failed_checks,last_check_error'
      : '')
  let query = adminSupabase.from(source.table).select(fields, { count: 'exact' })
  switch (params.kind) {
    case 'outbox':
      query = query.eq('status', 'dead')
      break
    case 'invoice':
      query = query.eq('status', 'failed')
      break
    case 'payment_reconciliation':
    case 'operational_alert':
      query = query.neq('status', 'resolved')
      break
    case 'provider_operation':
      query = query.or(
        'state.in.(prepared,dispatching,outcome_unknown,provider_pending,provider_failed,manual_review),and(state.eq.provider_succeeded,local_applied_at.is.null)'
      )
      break
    case 'retained_checkout':
      query = query.eq('state', 'active')
      break
    case 'late_capture_watch':
      query = query.neq('status', 'refunded')
      break
    case 'cancellation_refund':
      query = query.eq('job_type', 'cancellation_refund').neq('status', 'completed')
      break
  }
  const timeColumn =
    params.kind === 'retained_checkout'
      ? 'retention_deadline_at'
      : params.kind === 'operational_alert'
        ? 'last_seen_at'
        : params.kind === 'late_capture_watch' && modern
          ? 'next_check_at'
          : 'updated_at'
  const ascending = params.kind === 'retained_checkout' || params.kind === 'late_capture_watch'
  const idColumn = params.kind === 'retained_checkout' ? 'order_id' : 'id'
  const offset = (params.page - 1) * params.limit
  const { data, error, count } = await query
    .order(timeColumn, { ascending })
    .order(idColumn, { ascending })
    .range(offset, offset + params.limit - 1)
  if (error)
    throw databaseError(
      'admin.diagnostics.commerce_failures',
      error,
      'Commerce failure queues are unavailable',
      { statusCode: 503, code: 'DIAGNOSTICS_UNAVAILABLE' }
    )
  return {
    rows: (data ?? []) as unknown as Array<Record<string, unknown>>,
    total: count ?? 0,
    key: source.key,
  }
}

export async function getCommerceFailures(): Promise<Record<string, unknown>> {
  const pages = await Promise.all(
    CommerceKinds.map((kind) => getCommerceFailurePage({ kind, page: 1, limit: 20 }))
  )
  return Object.fromEntries(pages.map((page) => [page.key, page.rows]))
}

export async function reconcileProviderOperationAsAdmin(input: {
  operationId: string
  actorId: string
  reason: string
}) {
  const { data: target, error } = await adminSupabase
    .from('provider_operations')
    .select('order_id, state, local_applied_at')
    .eq('id', input.operationId)
    .single()
  if (error || !target) {
    await auditProviderAction({
      actorId: input.actorId,
      action: 'reconcile',
      reason: input.reason,
      outcome: 'failed',
      details: { requestedOperationId: input.operationId, error: 'Provider operation not found' },
    })
    throw databaseError(
      'admin.diagnostics.provider_operation',
      error,
      'Provider operation was not found',
      { statusCode: 404, code: 'PROVIDER_OPERATION_NOT_FOUND' }
    )
  }
  try {
    const operation = await reconcileProviderOperation(input.operationId, {
      allowRefundReplay: false,
    })
    const changed =
      operation.state !== target.state || operation.local_applied_at !== target.local_applied_at
    await auditProviderAction({
      operationId: input.operationId,
      orderId: operation.order_id,
      actorId: input.actorId,
      action: 'reconcile',
      reason: input.reason,
      outcome: changed ? 'success' : 'no_change',
      details: {
        resultingState: operation.state,
        localApplied: operation.local_applied_at !== null,
      },
    })
    return operation
  } catch (reconcileError) {
    await auditProviderAction({
      operationId: input.operationId,
      orderId: target.order_id as string,
      actorId: input.actorId,
      action: 'reconcile',
      reason: input.reason,
      outcome: 'failed',
      details: {
        error:
          reconcileError instanceof Error
            ? reconcileError.message.slice(0, 500)
            : 'Reconciliation failed',
      },
    })
    throw reconcileError
  }
}

export async function resolveRetainedCheckoutAsAdmin(input: {
  orderId: string
  action: 'recheck' | 'release'
  actorId: string
  reason: string
}) {
  const result = await resolveRetainedCheckout(
    input.orderId,
    input.action,
    input.reason,
    input.actorId
  )
  await auditProviderAction({
    orderId: input.orderId,
    actorId: input.actorId,
    action: `retention_${input.action}`,
    reason: input.reason,
    outcome: result.status === 'retained' ? 'no_change' : 'success',
    details: result,
  })
  return result
}

/**
 * Emergency-only: refresh a single shipment from Shiprocket.
 * Calls Shiprocket API directly — use sparingly.
 * Audit-logged in order_status_history.
 */
export async function refreshSingleShipment(
  orderId: string
): Promise<{ updated: boolean; oldStatus: string; newStatus: string | null }> {
  const { data: order, error } = await adminSupabase
    .from('orders')
    .select('id,awb_code,status')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw databaseError('shipping.load_refresh', error, 'Shipment could not be loaded')
  if (!order?.awb_code)
    throw Object.assign(new Error('Order not found or no AWB code'), { statusCode: 404 })
  const tracking = await trackSingle(order.awb_code)
  const { processTrackingResult } = await import('../../shiprocket/service')
  const result = await processTrackingResult(order.awb_code, tracking.tracking_data, 'manual')
  const current = await adminSupabase.from('orders').select('status').eq('id', orderId).single()
  if (current.error)
    throw databaseError(
      'shipping.read_refresh',
      current.error,
      'Shipment refresh result unavailable'
    )
  return {
    updated: result.applied ?? false,
    oldStatus: order.status,
    newStatus: current.data.status as string,
  }
}
