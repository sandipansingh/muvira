import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { trackSingle, generateLabel } from './shiprocket'
import { isValidTransition, shiprocketStatusToOrderStatus } from '../modules/orders/stateMachine'
import { transitionOrderStatus } from '../modules/orders/service'
import { writeTrackingSnapshot } from './trackingAnalytics'
import { executionLeaseRpcArgs, withExecutionLease, type ExecutionLease } from './executionLease'

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
  referenceId: string | null,
  executionLease: ExecutionLease
) => Promise<void>

export interface RetryJob {
  id: string
  job_type: string
  reference_id: string | null
  payload: Record<string, unknown>
  lease_token: string
}

interface RetryLeaseOptions {
  heartbeatMs?: number
  leaseSeconds?: number
}

const handlers: Record<string, JobHandler> = {
  razorpay_webhook: async (payload, referenceId) => {
    const webhookId = (payload['webhookId'] as string | undefined) ?? referenceId
    if (!webhookId) throw new Error('Missing webhookId in razorpay_webhook payload')

    const { processStoredRazorpayWebhook } = await import('../modules/payments/service')
    await processStoredRazorpayWebhook(webhookId)
  },

  tracking_sync: async (payload, _referenceId, executionLease) => {
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

    if (!isValidTransition(order.status, newStatus)) {
      logger.warn(
        { orderId: order.id, awb, from: order.status, to: newStatus },
        'Tracking retry retained an out-of-sequence provider status'
      )
      return
    }

    const oldStatus = order.status
    await transitionOrderStatus(order, newStatus, 'polling_sync', { awbCode: awb }, executionLease)

    // Write tracking snapshot
    writeTrackingSnapshot(
      {
        orderId: order.id,
        awbCode: awb,
        shipmentId: ((order as Record<string, unknown>)['shipment_id'] as string | null) ?? null,
        courierName: shipmentTrack.courier_name ?? null,
        currentStatus: shipmentTrack.current_status,
        origin: shipmentTrack.origin ?? null,
        destination: shipmentTrack.destination ?? null,
        edd: shipmentTrack.edd ?? null,
        pickupDate: shipmentTrack.pickup_date ?? null,
        deliveredDate: shipmentTrack.delivered_date ?? null,
        trackingRaw: shipmentTrack as unknown as Record<string, unknown>,
        syncSource: 'cron_poll',
      },
      executionLease
    ).catch(() => {})

    logger.info({ orderId: order.id, oldStatus, newStatus }, 'Tracking retry updated order')
  },

  webhook_process: async (payload, _referenceId, executionLease) => {
    const rawPayload = payload['rawPayload'] as Record<string, unknown> | undefined
    if (!rawPayload) throw new Error('Missing rawPayload in webhook_process payload')

    // Re-use the shiprocket webhook service to process the payload
    const { processShiprocketWebhook } = await import('../modules/shiprocket/service')
    const result = await processShiprocketWebhook(rawPayload, executionLease)

    if (result.status === 'ignored') {
      logger.warn({ payload }, 'retryWorker/webhook_process: no matching order found')
    }
  },

  label_generate: async (payload, _referenceId, executionLease) => {
    const shipmentId = payload['shipmentId'] as number | undefined
    if (!shipmentId) throw new Error('Missing shipmentId in label_generate payload')

    const result = await generateLabel(shipmentId)
    logger.info({ shipmentId, result }, 'retryWorker: label generated')

    // Update order if orderId is provided
    const orderId = payload['orderId'] as string | undefined
    if (orderId) {
      const { data, error } = await adminSupabase.rpc('set_order_label_generated_fenced', {
        ...executionLeaseRpcArgs(executionLease),
        p_order_id: orderId,
      })
      if (error || data !== true) throw new Error('Label state write was fenced out')
    }
  },

  invoice_generate: async (payload, referenceId, executionLease) => {
    const orderId = (payload['orderId'] as string | undefined) ?? referenceId
    if (!orderId) throw new Error('Missing application orderId in invoice_generate payload')

    const { adminGenerateInvoice } = await import('../modules/orders/service')
    await adminGenerateInvoice(orderId, executionLease)
    logger.info({ orderId }, 'retryWorker: invoice generated and persisted')
  },

  shiprocket_persist: async (payload, referenceId, executionLease) => {
    const orderId = (payload['orderId'] as string | undefined) ?? referenceId
    const persistence = payload['persistence'] as Record<string, unknown> | undefined
    const transition = payload['transition'] as Record<string, unknown> | undefined
    if (!orderId || (!persistence && !transition)) {
      throw new Error('Missing orderId or repair state in shiprocket_persist payload')
    }

    let order: { id: string; status: string; user_id: string; order_number: string }
    if (persistence) {
      const allowedKeys = new Set([
        'shiprocket_order_id',
        'shipment_id',
        'shiprocket_status',
        'shiprocket_error',
        'pickup_location',
        'package_weight_grams',
        'package_length_cm',
        'package_breadth_cm',
        'package_height_cm',
        'fulfillment_status',
        'fulfillment_step',
        'awb_code',
        'courier_name',
        'pickup_scheduled_date',
        'pickup_token_number',
        'label_generated',
        'manifest_generated',
      ])
      const safePersistence = Object.fromEntries(
        Object.entries(persistence).filter(([key]) => allowedKeys.has(key))
      )
      const result = await adminSupabase.rpc('apply_shiprocket_persistence_fenced', {
        ...executionLeaseRpcArgs(executionLease),
        p_order_id: orderId,
        p_persistence: safePersistence,
      })
      if (result.error || !result.data) {
        throw new Error(
          `Failed to reconcile Shiprocket persistence: ${result.error?.message ?? 'missing row'}`
        )
      }
      order = result.data as unknown as typeof order
    } else {
      const result = await adminSupabase
        .from('orders')
        .select('id, status, user_id, order_number')
        .eq('id', orderId)
        .single()
      if (result.error || !result.data) {
        throw new Error(
          `Failed to load Shiprocket transition repair: ${result.error?.message ?? 'missing row'}`
        )
      }
      order = result.data
    }

    if (transition) {
      const newStatus = transition['newStatus'] as string | undefined
      if (!newStatus) throw new Error('Missing status in Shiprocket transition repair')
      await transitionOrderStatus(
        order,
        newStatus,
        'admin_manual',
        {
          ...(transition['metadata'] as Record<string, unknown> | undefined),
          reconciliation: 'shiprocket_persist',
        },
        executionLease
      )
      return
    }

    if (order.status === 'confirmed') {
      await transitionOrderStatus(
        order,
        'processing',
        'system',
        { reconciliation: 'shiprocket_persist' },
        executionLease
      )
    }
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
  const limit = Math.max(1, Math.min(batchSize, 100))
  let processed = 0
  let succeeded = 0
  let failed = 0

  for (let index = 0; index < limit; index += 1) {
    const { data, error } = await adminSupabase.rpc('claim_retry_jobs', {
      p_limit: 1,
      p_lease_seconds: 300,
    })
    if (error) {
      logger.error({ error }, 'retryWorker: failed to claim jobs')
      break
    }

    const job = ((data ?? []) as unknown as RetryJob[])[0]
    if (!job) break
    processed += 1

    const handler = handlers[job.job_type]
    if (!handler) {
      await failClaimedJob(job, `Unknown job_type: ${job.job_type}`)
      failed++
      continue
    }

    const completed = await runClaimedRetryJob(job, handler)
    if (completed) {
      succeeded += 1
    } else {
      failed++
    }
  }

  if (succeeded + failed > 0) {
    logger.info({ succeeded, failed, total: processed }, 'retryWorker: batch processed')
  }

  return { processed, succeeded, failed }
}

export async function runClaimedRetryJob(
  job: RetryJob,
  handler: JobHandler,
  options: RetryLeaseOptions = {}
): Promise<boolean> {
  const heartbeatMs = options.heartbeatMs ?? 60_000
  const leaseSeconds = options.leaseSeconds ?? 300
  let stopped = false
  let leaseLost = false
  let renewal: Promise<void> | null = null

  const renew = async (): Promise<void> => {
    if (stopped || leaseLost) return
    const { data, error } = await adminSupabase.rpc('renew_retry_job_lease', {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_lease_seconds: leaseSeconds,
    })
    if (error || data !== true) leaseLost = true
  }

  const scheduleRenewal = (): void => {
    if (renewal || stopped || leaseLost) return
    renewal = renew().finally(() => {
      renewal = null
    })
  }

  const timer = setInterval(scheduleRenewal, heartbeatMs)
  timer.unref()

  const assertOwned = async (): Promise<void> => {
    if (renewal) await renewal
    if (!leaseLost) await renew()
    if (leaseLost) throw new Error('Retry job lease expired before side effects completed')
  }

  const stop = async (): Promise<void> => {
    stopped = true
    clearInterval(timer)
    if (renewal) await renewal
  }

  try {
    await assertOwned()
    await withExecutionLease(
      'retry_job_effect',
      job.id,
      async (effectHeartbeat) => {
        await handler(
          job.payload as Record<string, unknown>,
          job.reference_id,
          effectHeartbeat.lease
        )
        await effectHeartbeat.assertOwned()
      },
      {
        heartbeatMs,
        leaseSeconds,
        guard: { type: 'retry_job', id: job.id, token: job.lease_token },
      }
    )
    await assertOwned()
    await stop()

    const { data: completed, error: completionError } = await adminSupabase.rpc(
      'complete_retry_job',
      {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
      }
    )
    if (completionError || completed !== true) {
      throw new Error('Retry job lease expired before completion could be recorded')
    }
    return true
  } catch (err) {
    await stop()
    const errorMsg = err instanceof Error ? err.message : String(err)
    await failClaimedJob(job, errorMsg)
    return false
  }
}

async function failClaimedJob(job: RetryJob, error: string): Promise<void> {
  const { error: failureError } = await adminSupabase.rpc('fail_retry_job', {
    p_job_id: job.id,
    p_lease_token: job.lease_token,
    p_error: error,
  })
  if (failureError) {
    logger.error(
      { error: failureError, jobId: job.id },
      'retryWorker: failed to persist job failure'
    )
  }
}
