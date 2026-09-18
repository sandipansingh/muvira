import { logger } from '../lib/logger'
import { adminSupabase } from '../lib/supabase/admin'

export async function checkOperationalAlerts(): Promise<Record<string, number>> {
  const staleThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const results = await Promise.all([
    adminSupabase
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'failed'),
    adminSupabase
      .from('retry_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead'),
    adminSupabase
      .from('outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead'),
    adminSupabase
      .from('notification_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead'),
    adminSupabase
      .from('invoice_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    adminSupabase
      .from('payment_reconciliation_cases')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved'),
    adminSupabase
      .from('inventory_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'reserved')
      .lt('expires_at', now),
    adminSupabase
      .from('outbox_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
      .lt('claimed_at', staleThreshold),
    adminSupabase
      .from('notification_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
      .lt('claimed_at', staleThreshold),
    adminSupabase
      .from('retry_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('job_type', 'shiprocket_persist')
      .in('status', ['pending', 'failed', 'dead']),
    adminSupabase
      .from('operational_alerts')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved'),
    adminSupabase
      .from('provider_operations')
      .select('id', { count: 'exact', head: true })
      .is('local_applied_at', null)
      .in('state', [
        'dispatching',
        'outcome_unknown',
        'provider_pending',
        'provider_succeeded',
        'provider_failed',
        'manual_review',
      ]),
    adminSupabase
      .from('retained_checkout_cases')
      .select('order_id', { count: 'exact', head: true })
      .eq('state', 'active')
      .eq('escalation', 'critical'),
    adminSupabase
      .from('late_capture_watches')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'refunded'),
  ])

  const failedProbe = results.find((result) => result.error)
  if (failedProbe?.error) {
    throw new Error(`Operational alert query failed: ${failedProbe.error.message}`)
  }

  const counts = {
    failed_webhooks: results[0].count ?? 0,
    dead_retry_jobs: results[1].count ?? 0,
    dead_outbox_events: results[2].count ?? 0,
    dead_notification_deliveries: results[3].count ?? 0,
    failed_invoices: results[4].count ?? 0,
    payment_reconciliation_cases: results[5].count ?? 0,
    expired_inventory_reservations: results[6].count ?? 0,
    stuck_outbox_events: results[7].count ?? 0,
    stuck_notification_deliveries: results[8].count ?? 0,
    shiprocket_persistence_retries: results[9].count ?? 0,
    operational_alerts: results[10].count ?? 0,
    actionable_provider_operations: results[11].count ?? 0,
    critical_retained_checkouts: results[12].count ?? 0,
    late_capture_watches: results[13].count ?? 0,
  }

  if (Object.values(counts).some((count) => count > 0)) {
    logger.error({ alert: 'commerce_operations', counts }, 'Commerce operations require attention')
  }

  return counts
}
