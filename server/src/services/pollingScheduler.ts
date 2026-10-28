import cron, { type ScheduledTask } from 'node-cron'
import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { processRetryJobs } from './retryWorker'
import { processNotificationQueue } from './notificationDelivery'
import { recordFullPoll, recordOfdPoll, recordSyncError } from './metricsCollector'
import { checkOperationalAlerts } from './operationalAlerts'
import { expireAbandonedCheckouts } from '../modules/checkout/service'
import { reconcileActionableProviderOperations } from './providerOperations'
import { processLateCaptureWatches } from './retainedCheckout'
import { synchronizeActiveShipments } from './shipmentSync'
import { recoverShippingReceipts } from '../modules/shiprocket/service'

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
  if (scheduledJobs.length > 0) return
  logger.info('PollingScheduler: starting cron jobs')
  try {
    // Full poll: all active shipments — every 15 minutes
    const fullPoll = cron.schedule('*/15 * * * *', async () => {
      await pollActiveShipments('full_poll', ['processing', 'shipped', 'delivery_failed', 'rto'])
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
        await recoverShippingReceipts(50)
        await processRetryJobs(10)
      } catch (err) {
        logger.error({ err }, 'PollingScheduler: retryWorker failed')
      }
    })
    scheduledJobs.push(retryWorker)

    const checkoutExpiryWorker = cron.schedule('* * * * *', async () => {
      try {
        const result = await expireAbandonedCheckouts(100)
        await processLateCaptureWatches(20)
        if (result.released > 0 || result.retained > 0) {
          logger.info(result, 'PollingScheduler: inspected expired checkouts')
        }
      } catch (error) {
        logger.error({ error }, 'PollingScheduler: checkout expiry failed')
      }
    })
    scheduledJobs.push(checkoutExpiryWorker)

    const providerReconciliationWorker = cron.schedule('*/2 * * * *', async () => {
      try {
        await reconcileActionableProviderOperations(20)
      } catch (error) {
        logger.error({ error }, 'PollingScheduler: provider reconciliation failed')
      }
    })
    scheduledJobs.push(providerReconciliationWorker)

    const notificationWorker = cron.schedule('* * * * *', async () => {
      try {
        await processNotificationQueue(20)
      } catch (err) {
        logger.error({ err }, 'PollingScheduler: notification queue failed')
      }
    })
    scheduledJobs.push(notificationWorker)

    const operationalAlertWorker = cron.schedule('*/5 * * * *', async () => {
      try {
        await checkOperationalAlerts()
      } catch (err) {
        logger.error({ err }, 'PollingScheduler: operational alert check failed')
      }
    })
    scheduledJobs.push(operationalAlertWorker)

    logger.info(
      'PollingScheduler: cron jobs started (full=*/15, ofd=*/5, retry=*/10, expiry=*/1, provider=*/2, notifications=*/1, alerts=*/5)'
    )
  } catch (error) {
    stopPollingScheduler()
    throw error
  }
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
export async function pollActiveShipments(
  jobType: 'full_poll' | 'ofd_poll',
  statuses: string[]
): Promise<void> {
  const startTime = Date.now()
  let syncJobId = ''
  try {
    syncJobId = await startSyncJob(jobType)
    const { totalChecked, totalUpdated } = await synchronizeActiveShipments(statuses)
    await completeSyncJob(syncJobId, { ordersChecked: totalChecked, ordersUpdated: totalUpdated })
    if (jobType === 'full_poll') recordFullPoll(totalChecked, totalUpdated, Date.now() - startTime)
    else recordOfdPoll(totalChecked, totalUpdated, Date.now() - startTime)
  } catch (error) {
    recordSyncError()
    logger.error({ jobType, error }, 'Shipment synchronization failed')
    await failSyncJob(
      syncJobId,
      error instanceof Error ? error.message : 'Shipment synchronization failed'
    )
  }
}

async function startSyncJob(jobType: string): Promise<string> {
  const { data, error } = await adminSupabase
    .from('sync_jobs')
    .insert({ job_type: jobType, status: 'running' })
    .select('id')
    .single()

  if (error || !data) throw new Error('Synchronization job could not be persisted')
  return data.id as string
}

async function completeSyncJob(
  jobId: string,
  result: { ordersChecked: number; ordersUpdated: number; errors?: Array<{ message: string }> }
): Promise<void> {
  if (!jobId) return
  const { error } = await adminSupabase
    .from('sync_jobs')
    .update({
      status: result.errors?.length ? 'failed' : 'completed',
      orders_checked: result.ordersChecked,
      orders_updated: result.ordersUpdated,
      errors: result.errors ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
  if (error) throw new Error('Synchronization outcome could not be persisted')
}

async function failSyncJob(jobId: string, errorMessage: string): Promise<void> {
  if (!jobId) return
  const { error } = await adminSupabase
    .from('sync_jobs')
    .update({
      status: 'failed',
      errors: [{ message: errorMessage }],
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
  if (error) throw new Error('Synchronization outcome could not be persisted')
}
