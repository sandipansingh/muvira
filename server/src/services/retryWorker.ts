import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { trackSingle, generateLabel, generateInvoice } from './shiprocket'
import {
  shiprocketStatusToOrderStatus,
  isValidTransition,
} from '../modules/orders/stateMachine'
import { emitStatusChangeEvents } from './eventBus'
import { writeTrackingSnapshot } from './trackingAnalytics'

/**
 * Retry Worker
 *
 * Processes pending jobs from the retry_jobs table. Called periodically
 * by the polling scheduler and can also be triggered manually via admin API.
 *
 * Each job type has a handler registered here. Unknown job types are marked
 * as 'dead'.
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

    // Get order for state machine validation
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, user_id, status, order_number, shipment_id')
      .eq('awb_code', awb)
      .maybeSingle()

    if (!order) return
    if (order.status === newStatus) return

    // Validate transition via state machine
    if (!isValidTransition(order.status, newStatus)) {
      logger.warn(
        { orderId: order.id, awb, from: order.status, to: newStatus },
        'retryWorker/tracking_sync: blocked invalid transition'
      )
      return
    }

    const oldStatus = order.status

    // Atomic update
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
      .eq('status', oldStatus)

    if (updateError) {
      logger.warn({ err: updateError, orderId: order.id }, 'retryWorker/tracking_sync: update failed')
      return
    }

    // Record status history
    await adminSupabase.from('order_status_history').insert({
      order_id: order.id,
      old_status: oldStatus,
      new_status: newStatus,
      source: 'polling_sync',
    })

    // Write tracking snapshot
    writeTrackingSnapshot({
      orderId: order.id,
      awbCode: awb,
      shipmentId: (order as Record<string, unknown>)['shipment_id'] as string | null ?? null,
      courierName: shipmentTrack.courier_name ?? null,
      currentStatus: shipmentTrack.current_status,
      origin: shipmentTrack.origin ?? null,
      destination: shipmentTrack.destination ?? null,
      edd: shipmentTrack.edd ?? null,
      pickupDate: shipmentTrack.pickup_date ?? null,
      deliveredDate: shipmentTrack.delivered_date ?? null,
      trackingRaw: shipmentTrack as unknown as Record<string, unknown>,
      syncSource: 'cron_poll',
    }).catch(() => {})

    // Emit events for notifications
    emitStatusChangeEvents({
      orderId: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      oldStatus,
      newStatus,
      source: 'polling_sync',
      awbCode: awb,
      courierName: shipmentTrack.courier_name ?? null,
    })
  },

  webhook_process: async (payload) => {
    const rawPayload = payload['rawPayload'] as Record<string, unknown> | undefined
    if (!rawPayload) throw new Error('Missing rawPayload in webhook_process payload')

    // Re-use the shiprocket webhook service to process the payload
    const { processShiprocketWebhook } = await import('../modules/shiprocket/service')
    const result = await processShiprocketWebhook(rawPayload)

    if (result.status === 'ignored') {
      logger.warn({ payload }, 'retryWorker/webhook_process: no matching order found')
    }
  },

  notification: async (payload) => {
    const orderId = payload['orderId'] as string | undefined
    const userId = payload['userId'] as string | undefined
    const eventType = payload['eventType'] as string | undefined
    if (!orderId || !userId || !eventType) {
      throw new Error('Missing required fields in notification payload')
    }

    // Re-emit the event so notification subscriber picks it up
    const { emitOrderEvent } = await import('./eventBus')
    emitOrderEvent(eventType as import('./eventBus').OrderDomainEvent, {
      orderId,
      userId,
      newStatus: (payload['newStatus'] as string) ?? '',
      source: (payload['source'] as 'webhook' | 'polling_sync' | 'admin_manual' | 'system') ?? 'system',
      awbCode: (payload['awbCode'] as string | null) ?? null,
    })
  },

  label_generate: async (payload) => {
    const shipmentId = payload['shipmentId'] as number | undefined
    if (!shipmentId) throw new Error('Missing shipmentId in label_generate payload')

    const result = await generateLabel(shipmentId)
    logger.info({ shipmentId, result }, 'retryWorker: label generated')

    // Update order if orderId is provided
    const orderId = payload['orderId'] as string | undefined
    if (orderId) {
      await adminSupabase
        .from('orders')
        .update({ label_generated: true })
        .eq('id', orderId)
    }
  },

  invoice_generate: async (payload) => {
    const orderIds = payload['orderIds'] as number[] | undefined
    if (!orderIds || orderIds.length === 0) throw new Error('Missing orderIds in invoice_generate payload')

    const result = await generateInvoice(orderIds)
    logger.info({ orderIds, result }, 'retryWorker: invoice generated')
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
