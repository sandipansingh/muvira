import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { trackSingle } from './shiprocket'
import { shiprocketStatusToOrderStatus } from '../modules/orders/stateMachine'

/**
 * Retry Worker
 *
 * Processes pending jobs from the retry_jobs table. Called periodically
 * by the polling scheduler and can also be triggered manually via admin API.
 *
 * Each job type has a handler registered here. Unknown job types are marked
 * as 'failed' with an error.
 */

type JobHandler = (
  payload: Record<string, unknown>,
  referenceId: string | null
) => Promise<void>

const handlers: Record<string, JobHandler> = {
  tracking_sync: async (payload) => {
    const awb = payload['awbCode'] as string | undefined
    if (!awb) throw new Error('Missing awbCode in tracking_sync payload')

    const trackResult = await trackSingle(awb)
    const shipmentTrack = trackResult.tracking_data?.shipment_track?.[0]
    if (!shipmentTrack) return

    const srStatus = shipmentTrack.current_status
    const newStatus = shiprocketStatusToOrderStatus(srStatus)
    if (!newStatus) return

    await adminSupabase
      .from('orders')
      .update({ status: newStatus })
      .eq('awb_code', awb)
      .neq('status', newStatus)
  },

  notification: async (payload) => {
    // Notification retries are handled by the notification subscriber's
    // idempotency mechanism. This handler is a stub for now.
    logger.info({ payload }, 'retryWorker: notification stub')
  },

  webhook_process: async (payload) => {
    // Webhook reprocessing is a stub. In production, this would re-parse
    // the raw webhook payload and re-run the webhook processing logic.
    logger.info({ payload }, 'retryWorker: webhook_process stub')
  },

  label_generate: async (payload) => {
    logger.info({ payload }, 'retryWorker: label_generate stub')
  },

  invoice_generate: async (payload) => {
    logger.info({ payload }, 'retryWorker: invoice_generate stub')
  },
}

/**
 * Process a batch of pending retry jobs. Called by the scheduler or admin API.
 * Returns the number of jobs processed.
 */
export async function processRetryJobs(batchSize = 10): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const { data: jobs, error } = await adminSupabase
    .from('retry_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(batchSize)

  if (error || !jobs || jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  // Mark all as processing to prevent concurrent workers from picking them up
  const jobIds = jobs.map((j) => j.id)
  await adminSupabase
    .from('retry_jobs')
    .update({ status: 'processing' })
    .in('id', jobIds)

  for (const job of jobs) {
    const handler = handlers[job.job_type]
    if (!handler) {
      await markJobDead(job.id, `Unknown job_type: ${job.job_type}`)
      failed++
      continue
    }

    try {
      await handler(job.payload as Record<string, unknown>, job.reference_id)
      await adminSupabase
        .from('retry_jobs')
        .update({ status: 'completed' })
        .eq('id', job.id)
      succeeded++
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      const newRetryCount = job.retry_count + 1

      if (newRetryCount >= job.max_retries) {
        await markJobDead(job.id, errorMsg)
      } else {
        const backoffMs = Math.min(60_000 * 2 ** newRetryCount, 3_600_000) // 1h max
        await adminSupabase
          .from('retry_jobs')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            last_error: errorMsg,
            next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
          })
          .eq('id', job.id)
      }
      failed++
    }
  }

  if (succeeded + failed > 0) {
    logger.info(
      { succeeded, failed, total: jobs.length },
      'retryWorker: batch processed'
    )
  }

  return { processed: jobs.length, succeeded, failed }
}

async function markJobDead(jobId: string, error: string): Promise<void> {
  await adminSupabase
    .from('retry_jobs')
    .update({
      status: 'dead',
      last_error: error,
    })
    .eq('id', jobId)
}
