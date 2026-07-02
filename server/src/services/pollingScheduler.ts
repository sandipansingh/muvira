import cron, { type ScheduledTask } from 'node-cron'
import { adminSupabase } from '../lib/supabase/admin'
import { trackBulk } from './shiprocket'
import { logger } from '../lib/logger'
import { shiprocketStatusToOrderStatus, isValidTransition } from '../modules/orders/stateMachine'
import { emitStatusChangeEvents } from './eventBus'
import { processRetryJobs } from './retryWorker'
import { writeTrackingSnapshot } from './trackingAnalytics'
import { recordFullPoll, recordOfdPoll, recordSyncError } from './metricsCollector'

/**
 * Intelligent Polling Scheduler
 *
 * Webhooks are primary. Polling is the fallback, using adaptive intervals
 * based on shipment state:
 *
 *   After shipment creation (processing):  every 15 minutes
 *   After shipped / in transit:            every 30 minutes
 *   After out for delivery:               every 5 minutes
 *   Delivered / terminal:                  stop polling
 *
 * Failures are logged and retried on the next cycle (exponential backoff
 * is handled by the DB-backed retry_jobs table).
 */

let scheduledJobs: ScheduledTask[] = []

/**
 * Start all polling cron jobs. Called once at server startup.
 */
export function startPollingScheduler(): void {
  logger.info('PollingScheduler: starting cron jobs')

  // Full poll: all active shipments — every 15 minutes
  const fullPoll = cron.schedule('*/15 * * * *', async () => {
    await pollActiveShipments('full_poll', ['processing', 'shipped'])
    await pollActiveShipments('full_poll', ['out_for_delivery'])
  })
  scheduledJobs.push(fullPoll)

  // OFD poll: out-for-delivery shipments — every 5 minutes
  const ofdPoll = cron.schedule('*/5 * * * *', async () => {
    await pollActiveShipments('ofd_poll', ['out_for_delivery'])
  })
  scheduledJobs.push(ofdPoll)

  // Retry worker: process failed jobs — every 10 minutes
  const retryWorker = cron.schedule('*/10 * * * *', async () => {
    try {
      await processRetryJobs(10)
    } catch (err) {
      logger.error({ err }, 'PollingScheduler: retryWorker failed')
    }
  })
  scheduledJobs.push(retryWorker)

  logger.info('PollingScheduler: cron jobs started (full=*/15, ofd=*/5, retry=*/10)')
}

/**
 * Stop all polling cron jobs. Called on server shutdown.
 */
export function stopPollingScheduler(): void {
  scheduledJobs.forEach((job) => job.stop())
  scheduledJobs = []
  logger.info('PollingScheduler: all cron jobs stopped')
}

/**
 * Fetch and sync active shipments for given statuses.
 */
async function pollActiveShipments(
  jobType: 'full_poll' | 'ofd_poll',
  statuses: string[]
): Promise<void> {
  const syncJobId = await startSyncJob(jobType)
  const startTime = Date.now()

  try {
    const statusList = statuses.map((s) => `"${s}"`).join(',')

    const { data: orders, error } = await adminSupabase
      .from('orders')
      .select('id, awb_code, status, user_id, order_number, shipment_id')
      .not('awb_code', 'is', null)
      .filter('status', 'in', `(${statusList})`)
      .limit(500)

    if (error || !orders || orders.length === 0) {
      await completeSyncJob(syncJobId, { ordersChecked: 0, ordersUpdated: 0 })
      return
    }

    const awbs = orders
      .map((o) => o.awb_code)
      .filter((awb): awb is string => typeof awb === 'string' && awb.trim() !== '')

    if (awbs.length === 0) {
      await completeSyncJob(syncJobId, { ordersChecked: 0, ordersUpdated: 0 })
      return
    }

    let ordersUpdated = 0

    try {
      const trackingData = await trackBulk(awbs)

      for (const order of orders) {
        const awb = order.awb_code
        if (!awb) continue

        const item = trackingData[awb]
        const trackingInfo = item?.tracking_data?.shipment_track?.[0]
        if (!trackingInfo) continue

        // Write tracking snapshot for analytics (fire-and-forget)
        writeTrackingSnapshot({
          orderId: order.id,
          awbCode: awb,
          shipmentId: ((order as Record<string, unknown>)['shipment_id'] as string | null) ?? null,
          courierName: trackingInfo.courier_name ?? null,
          currentStatus: trackingInfo.current_status,
          origin: trackingInfo.origin ?? null,
          destination: trackingInfo.destination ?? null,
          edd: trackingInfo.edd ?? null,
          pickupDate: trackingInfo.pickup_date ?? null,
          deliveredDate: trackingInfo.delivered_date ?? null,
          trackingRaw: trackingInfo as unknown as Record<string, unknown>,
          syncSource: 'cron_poll',
        }).catch(() => {})

        const srStatus = trackingInfo.current_status
        const newStatus = shiprocketStatusToOrderStatus(srStatus)
        if (!newStatus || newStatus === order.status) continue

        // Transition validation
        if (!isValidTransition(order.status, newStatus)) {
          logger.warn(
            { orderId: order.id, awb, from: order.status, to: newStatus },
            'PollingScheduler: blocked invalid transition'
          )
          continue
        }

        // Atomic update + status history
        const { error: updateError } = await adminSupabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id)
          .eq('status', order.status) // optimistic concurrency

        if (updateError) {
          logger.warn({ err: updateError, orderId: order.id }, 'PollingScheduler: update failed')
          continue
        }

        // Record status history
        await adminSupabase.from('order_status_history').insert({
          order_id: order.id,
          old_status: order.status,
          new_status: newStatus,
          source: 'polling_sync',
        })

        // Emit event for subscribers (notifications, etc.)
        emitStatusChangeEvents({
          orderId: order.id,
          orderNumber: order.order_number,
          userId: order.user_id,
          oldStatus: order.status,
          newStatus,
          source: 'polling_sync',
          awbCode: awb,
        })

        ordersUpdated++
      }
    } catch (err) {
      logger.error({ err, jobType }, 'PollingScheduler: Shiprocket API call failed')
      recordSyncError()
      await completeSyncJob(syncJobId, {
        ordersChecked: orders.length,
        ordersUpdated,
        errors: [{ message: err instanceof Error ? err.message : String(err) }],
      })
      return
    }

    await completeSyncJob(syncJobId, {
      ordersChecked: orders.length,
      ordersUpdated,
    })

    if (ordersUpdated > 0) {
      logger.info(
        { jobType, ordersChecked: orders.length, ordersUpdated },
        'PollingScheduler: sync cycle completed'
      )
    }

    if (jobType === 'full_poll') {
      recordFullPoll(orders.length, ordersUpdated, Date.now() - startTime)
    } else {
      recordOfdPoll(orders.length, ordersUpdated, Date.now() - startTime)
    }
  } catch (err) {
    logger.error({ err, jobType }, 'PollingScheduler: unexpected error')
    recordSyncError()
    await failSyncJob(syncJobId, err instanceof Error ? err.message : String(err))
  }
}

async function startSyncJob(jobType: string): Promise<string> {
  const { data } = await adminSupabase
    .from('sync_jobs')
    .insert({ job_type: jobType, status: 'running' })
    .select('id')
    .single()

  return data?.id ?? ''
}

async function completeSyncJob(
  jobId: string,
  result: { ordersChecked: number; ordersUpdated: number; errors?: Array<{ message: string }> }
): Promise<void> {
  if (!jobId) return
  await adminSupabase
    .from('sync_jobs')
    .update({
      status: 'completed',
      orders_checked: result.ordersChecked,
      orders_updated: result.ordersUpdated,
      errors: result.errors ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function failSyncJob(jobId: string, errorMessage: string): Promise<void> {
  if (!jobId) return
  await adminSupabase
    .from('sync_jobs')
    .update({
      status: 'failed',
      errors: [{ message: errorMessage }],
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}
