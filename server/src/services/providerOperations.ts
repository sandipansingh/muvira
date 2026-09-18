import crypto from 'crypto'
import { adminSupabase } from '../lib/supabase/admin'
import { databaseError } from '../lib/databaseError'
import { razorpay } from '../lib/razorpay/client'
import { logger } from '../lib/logger'
import {
  AppError,
  type ProviderMutationAdapter,
  type ProviderOperation,
  type ProviderOperationState,
} from '../types'
import {
  cancelOrder as cancelShiprocketOrder,
  cancelShipment as cancelShiprocketShipment,
  getOrderDetails,
  trackSingle,
  type ShiprocketError,
} from './shiprocket'
import { executionLeaseRpcArgs, withExecutionLease, type ExecutionLease } from './executionLease'

export interface RefundRecord {
  id: string
  payment_id: string
  amount?: number
  currency: string
  receipt?: string | null
  status: 'pending' | 'processed' | 'failed'
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    )
  }
  return value
}

export function canonicalProviderRequest(value: Record<string, unknown>): string {
  return JSON.stringify(canonicalize(value))
}

export function providerRequestHash(value: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(canonicalProviderRequest(value)).digest('hex')
}

function withProviderTimeout<T>(promise: Promise<T>, timeoutMs = 20_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Provider request timed out')), timeoutMs)
    timer.unref()
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function asOperation(data: unknown): ProviderOperation {
  return data as ProviderOperation
}

async function loadOperation(operationId: string): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase
    .from('provider_operations')
    .select('*')
    .eq('id', operationId)
    .single()
  if (error || !data) {
    throw databaseError('provider_operations.load', error, 'Provider operation was not found', {
      statusCode: 404,
      code: 'PROVIDER_OPERATION_NOT_FOUND',
    })
  }
  return asOperation(data)
}

async function persistOperationAlert(
  operation: ProviderOperation,
  alertType: string,
  message: string
): Promise<void> {
  const { error } = await adminSupabase.rpc('persist_operational_alert', {
    p_alert_type: alertType,
    p_severity: 'critical',
    p_source: 'provider_operation',
    p_reference_id: operation.id,
    p_message: message,
    p_details: {
      provider: operation.provider,
      operationType: operation.operation_type,
      state: operation.state,
      target: operation.provider_target_id,
      amountPaisa: operation.amount_paisa,
      currency: operation.currency,
    },
    p_order_id: operation.order_id,
    p_webhook_event_id: null,
  })
  if (error) logger.fatal({ error, operationId: operation.id }, 'Provider alert write failed')
}

async function claimDispatch(
  operationId: string,
  lease: ExecutionLease
): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase.rpc('claim_provider_operation_dispatch', {
    ...executionLeaseRpcArgs(lease),
    p_operation_id: operationId,
  })
  if (error || !data) {
    throw databaseError(
      'provider_operations.claim_dispatch',
      error,
      'Provider operation could not be dispatched',
      { statusCode: 409, code: 'PROVIDER_OPERATION_NOT_DISPATCHABLE' }
    )
  }
  return asOperation(data)
}

async function recordOutcome(
  operationId: string,
  state: Exclude<ProviderOperationState, 'prepared' | 'dispatching'>,
  lease: ExecutionLease,
  input: {
    providerOperationId?: string
    providerStatus?: string
    metadata?: Record<string, unknown>
    errorClassification?: string
    manualReviewReason?: string
  } = {}
): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase.rpc('record_provider_operation_result', {
    ...executionLeaseRpcArgs(lease),
    p_operation_id: operationId,
    p_state: state,
    p_provider_operation_id: input.providerOperationId ?? null,
    p_provider_status: input.providerStatus ?? null,
    p_response_metadata: input.metadata ?? {},
    p_error_classification: input.errorClassification ?? null,
    p_manual_review_reason: input.manualReviewReason ?? null,
  })
  if (error || !data) {
    throw databaseError(
      'provider_operations.record_outcome',
      error,
      'Provider outcome could not be persisted',
      { code: 'PROVIDER_OUTCOME_PERSISTENCE_FAILED', statusCode: 503 }
    )
  }
  return asOperation(data)
}

async function finalizeOperation(
  operation: ProviderOperation,
  lease: ExecutionLease
): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase.rpc('finalize_provider_operation', {
    ...executionLeaseRpcArgs(lease),
    p_operation_id: operation.id,
    p_provider_target_type: operation.provider_target_type,
    p_provider_target_id: operation.provider_target_id,
    p_payment_id: operation.payment_id,
    p_amount_paisa: operation.amount_paisa,
    p_currency: operation.currency,
    p_request_hash: operation.request_hash,
  })
  if (error || !data) {
    await persistOperationAlert(
      operation,
      'provider_operation_local_pending',
      'Provider succeeded but the local business state is not yet applied'
    )
    throw databaseError(
      'provider_operations.finalize',
      error,
      'Provider succeeded but local completion requires reconciliation',
      { code: 'PROVIDER_LOCAL_FINALIZATION_PENDING', statusCode: 503 }
    )
  }
  return asOperation(data)
}

export async function prepareRefund(
  orderId: string,
  input: { cause: string; amountPaisa?: number; refundIntentId?: string }
): Promise<ProviderOperation | null> {
  const { data: payment, error } = await adminSupabase
    .from('payments')
    .select(
      'id, order_id, razorpay_payment_id, amount_paisa, refunded_amount_paisa, currency, status'
    )
    .eq('order_id', orderId)
    .maybeSingle()
  if (error)
    throw databaseError('provider_operations.load_refund_payment', error, 'Payment unavailable')
  if (!payment || payment.status === 'refunded') return null
  if (payment.status !== 'captured' || !payment.razorpay_payment_id) {
    throw new AppError(409, 'PAYMENT_NOT_REFUNDABLE', 'The order has no captured payment to refund')
  }

  const isPartial = input.amountPaisa !== undefined
  if (isPartial && !input.refundIntentId) {
    throw new AppError(
      400,
      'REFUND_INTENT_REQUIRED',
      'A stable refund intent ID is required for a partial refund'
    )
  }
  const amountPaisa = input.amountPaisa ?? payment.amount_paisa
  if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0) {
    throw new AppError(400, 'INVALID_REFUND_AMOUNT', 'Refund amount must be positive paisa')
  }
  const operationType = isPartial ? 'partial_refund' : 'full_refund'
  const businessKey = isPartial
    ? `partial-refund:${payment.id}:${input.refundIntentId}`
    : `full-refund:${payment.id}`
  const hash = providerRequestHash({
    amount_paisa: amountPaisa,
    currency: payment.currency,
    operation_type: operationType,
    order_id: orderId,
    payment_id: payment.id,
    provider: 'razorpay',
    provider_target_id: payment.razorpay_payment_id,
    provider_target_type: 'payment',
  })
  const { data, error: prepareError } = await adminSupabase.rpc('prepare_provider_operation', {
    p_provider: 'razorpay',
    p_operation_type: operationType,
    p_business_key: businessKey,
    p_order_id: orderId,
    p_payment_id: payment.id,
    p_provider_target_type: 'payment',
    p_provider_target_id: payment.razorpay_payment_id,
    p_amount_paisa: amountPaisa,
    p_currency: payment.currency,
    p_request_hash: hash,
    p_cause: input.cause,
  })
  if (prepareError || !data) {
    throw databaseError(
      'provider_operations.prepare_refund',
      prepareError,
      'Refund intent could not be prepared'
    )
  }
  return asOperation(data)
}

export async function prepareFullRefund(
  orderId: string,
  cause: string
): Promise<ProviderOperation | null> {
  return prepareRefund(orderId, { cause })
}

export async function prepareLateCaptureRefund(
  input: {
    orderId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    amountPaisa: number
    currency: string
    reason: string
  },
  lease: ExecutionLease
): Promise<ProviderOperation> {
  const hash = providerRequestHash({
    amount_paisa: input.amountPaisa,
    currency: input.currency,
    operation_type: 'full_refund',
    order_id: input.orderId,
    payment_id: input.razorpayOrderId,
    provider: 'razorpay',
    provider_target_id: input.razorpayPaymentId,
    provider_target_type: 'payment',
  })
  const { data, error } = await adminSupabase.rpc('prepare_late_capture_refund_fenced', {
    ...executionLeaseRpcArgs(lease),
    p_order_id: input.orderId,
    p_razorpay_order_id: input.razorpayOrderId,
    p_razorpay_payment_id: input.razorpayPaymentId,
    p_amount_paisa: input.amountPaisa,
    p_currency: input.currency,
    p_request_hash: hash,
    p_reason: input.reason,
  })
  if (error || !data) {
    throw databaseError(
      'provider_operations.prepare_late_capture_refund',
      error,
      'Late capture refund could not be prepared',
      { statusCode: 503, code: 'LATE_CAPTURE_REFUND_PREPARE_FAILED' }
    )
  }
  return asOperation(data)
}

export async function handleLateCapture(
  input: {
    orderId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    amountPaisa: number
    currency: string
  },
  lease: ExecutionLease
): Promise<ProviderOperation | null> {
  const { data: watch, error } = await adminSupabase
    .from('late_capture_watches')
    .select('id, status')
    .eq('order_id', input.orderId)
    .maybeSingle()
  if (error) {
    throw databaseError(
      'provider_operations.load_late_capture_watch',
      error,
      'Late capture state is unavailable'
    )
  }
  if (!watch || watch.status === 'refunded') return null
  const operation = await prepareLateCaptureRefund(
    { ...input, reason: 'Payment captured after checkout inventory was released' },
    lease
  )
  return dispatchRazorpayRefund(operation.id)
}

async function lookupRefund(operation: ProviderOperation): Promise<RefundRecord | null> {
  let skip = 0
  while (skip < 1000) {
    const page = await razorpay.payments.fetchMultipleRefund(operation.provider_target_id, {
      count: 100,
      skip,
    })
    const match = page.items.find((refund) => refund.receipt === operation.idempotency_key)
    if (match) return match as RefundRecord
    if (page.items.length < 100) return null
    skip += page.items.length
  }
  return null
}

export const razorpayRefundAdapter: ProviderMutationAdapter<RefundRecord> = {
  async mutate(operation) {
    return withProviderTimeout(
      razorpay.payments.refund(operation.provider_target_id, {
        amount: operation.amount_paisa ?? undefined,
        speed: 'normal',
        receipt: operation.idempotency_key,
        notes: { provider_operation_id: operation.id },
      }) as Promise<RefundRecord>
    )
  },
  reconcile: lookupRefund,
}

function providerErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const candidate = error as { statusCode?: unknown; status?: unknown }
  const value = candidate.statusCode ?? candidate.status
  return typeof value === 'number' ? value : null
}

function isDuplicateReceiptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return message.includes('duplicate') && message.includes('receipt')
}

function isDefinitiveRefundRejection(error: unknown): boolean {
  const status = providerErrorStatus(error)
  return status !== null && status >= 400 && status < 500 && ![408, 409, 429].includes(status)
}

function refundMatches(operation: ProviderOperation, refund: RefundRecord): boolean {
  return (
    refund.receipt === operation.idempotency_key &&
    refund.payment_id === operation.provider_target_id &&
    Number(refund.amount) === operation.amount_paisa &&
    refund.currency === operation.currency
  )
}

async function adoptRefund(
  operation: ProviderOperation,
  refund: RefundRecord,
  lease: ExecutionLease
): Promise<ProviderOperation> {
  if (!refundMatches(operation, refund)) {
    const reviewed = await recordOutcome(operation.id, 'manual_review', lease, {
      providerOperationId: refund.id,
      providerStatus: refund.status,
      errorClassification: 'REFUND_IDENTITY_MISMATCH',
      manualReviewReason: 'Razorpay refund identity did not match the immutable request',
      metadata: { receiptMatched: refund.receipt === operation.idempotency_key },
    })
    await persistOperationAlert(
      reviewed,
      'provider_operation_identity_mismatch',
      'Razorpay refund identity did not match the immutable request'
    )
    return reviewed
  }

  if (refund.status === 'processed') {
    const succeeded = await recordOutcome(operation.id, 'provider_succeeded', lease, {
      providerOperationId: refund.id,
      providerStatus: refund.status,
      metadata: { receipt: refund.receipt },
    })
    return finalizeOperation(succeeded, lease)
  }
  if (refund.status === 'pending') {
    return recordOutcome(operation.id, 'provider_pending', lease, {
      providerOperationId: refund.id,
      providerStatus: refund.status,
      metadata: { receipt: refund.receipt },
    })
  }
  const failed = await recordOutcome(operation.id, 'provider_failed', lease, {
    providerOperationId: refund.id,
    providerStatus: refund.status,
    errorClassification: 'PROVIDER_REJECTED',
    metadata: { receipt: refund.receipt },
  })
  await persistOperationAlert(
    failed,
    'provider_operation_failed',
    'Razorpay refund failed and requires review before a new intent'
  )
  return failed
}

async function dispatchRefundOnce(
  operation: ProviderOperation,
  lease: ExecutionLease,
  adapter: ProviderMutationAdapter<RefundRecord>
): Promise<ProviderOperation> {
  const dispatching = await claimDispatch(operation.id, lease)
  let refund: RefundRecord
  try {
    refund = await adapter.mutate(dispatching)
  } catch (error) {
    if (isDefinitiveRefundRejection(error) && !isDuplicateReceiptError(error)) {
      const failed = await recordOutcome(dispatching.id, 'provider_failed', lease, {
        errorClassification: 'PROVIDER_REJECTED',
        metadata: { message: error instanceof Error ? error.message.slice(0, 500) : 'rejected' },
      })
      await persistOperationAlert(
        failed,
        'provider_operation_failed',
        'Razorpay rejected the refund intent; a replacement requires separate authorization'
      )
      return failed
    }
    const unknown = await recordOutcome(dispatching.id, 'outcome_unknown', lease, {
      errorClassification: isDuplicateReceiptError(error)
        ? 'DUPLICATE_RECEIPT_REQUIRES_LOOKUP'
        : 'AMBIGUOUS_PROVIDER_RESPONSE',
      metadata: { message: error instanceof Error ? error.message.slice(0, 500) : 'unknown' },
    })
    await persistOperationAlert(
      unknown,
      'provider_operation_outcome_unknown',
      'Razorpay refund response was ambiguous and requires receipt reconciliation'
    )
    return unknown
  }
  return adoptRefund(dispatching, refund, lease)
}

async function reconcileRefund(
  operation: ProviderOperation,
  lease: ExecutionLease,
  allowIdenticalRetry: boolean,
  adapter: ProviderMutationAdapter<RefundRecord>
): Promise<ProviderOperation> {
  let refund = await adapter.reconcile(operation)
  if (!refund) {
    for (const delayMs of [250, 1_000, 2_000]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      refund = await adapter.reconcile(operation)
      if (refund) break
    }
  }
  if (refund) return adoptRefund(operation, refund, lease)
  if (!allowIdenticalRetry || operation.dispatch_attempts >= 2) {
    const reviewed = await recordOutcome(operation.id, 'manual_review', lease, {
      errorClassification: 'REFUND_NOT_FOUND',
      manualReviewReason: 'Razorpay refund was not found after the one authorized replay',
      metadata: { receipt: operation.idempotency_key },
    })
    await persistOperationAlert(
      reviewed,
      'provider_operation_manual_review',
      'Razorpay refund was not found after the one authorized identical replay'
    )
    return reviewed
  }
  const noMatch = await recordOutcome(operation.id, 'outcome_unknown', lease, {
    errorClassification: 'REFUND_NOT_FOUND',
    metadata: { receipt: operation.idempotency_key, reconciliation: 'no_match' },
  })
  const { data, error } = await adminSupabase.rpc('authorize_razorpay_refund_retry', {
    ...executionLeaseRpcArgs(lease),
    p_operation_id: operation.id,
  })
  if (error || !data) return noMatch
  const replayed = await dispatchRefundOnce(asOperation(data), lease, adapter)
  if (replayed.state === 'outcome_unknown') {
    return reconcileRefund(replayed, lease, false, adapter)
  }
  return replayed
}

export async function dispatchRazorpayRefund(
  operationId: string,
  adapter: ProviderMutationAdapter<RefundRecord> = razorpayRefundAdapter
): Promise<ProviderOperation> {
  return withExecutionLease('provider_operation', operationId, async ({ lease }) => {
    let operation = await loadOperation(operationId)
    if (operation.local_applied_at) return operation
    if (operation.state === 'prepared') {
      operation = await dispatchRefundOnce(operation, lease, adapter)
      if (operation.state !== 'outcome_unknown') return operation
    }
    if (
      operation.state === 'dispatching' ||
      operation.state === 'outcome_unknown' ||
      operation.state === 'provider_pending'
    ) {
      return reconcileRefund(
        operation,
        lease,
        operation.state !== 'provider_pending' && operation.dispatch_attempts < 2,
        adapter
      )
    }
    if (operation.state === 'provider_succeeded') return finalizeOperation(operation, lease)
    return operation
  })
}

async function prepareShiprocketCancellation(
  orderId: string,
  cause: string,
  lease: ExecutionLease
): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase.rpc('prepare_shiprocket_cancellation', {
    ...executionLeaseRpcArgs(lease),
    p_order_id: orderId,
    p_cause: cause,
  })
  if (error || !data) {
    throw databaseError(
      'provider_operations.prepare_cancellation',
      error,
      'Cancellation intent could not be prepared'
    )
  }
  return asOperation(data)
}

export interface ShiprocketCancellationObservation {
  status: string
  definitive: boolean
  metadata: Record<string, unknown>
}

function cancellationFailureIsDefinitive(error: unknown): boolean {
  const shiprocketError = error as Partial<ShiprocketError>
  return shiprocketError.type === 'BAD_REQUEST'
}

function isCancelledStatus(value: unknown): boolean {
  const status = typeof value === 'string' ? value.toLowerCase() : ''
  return status.includes('cancel')
}

export const shiprocketCancellationAdapter: ProviderMutationAdapter<ShiprocketCancellationObservation> =
  {
    async mutate(operation) {
      const result =
        operation.operation_type === 'cancel_shipment'
          ? await cancelShiprocketShipment({ awbs: [operation.provider_target_id] })
          : await cancelShiprocketOrder({ ids: [Number(operation.provider_target_id)] })
      const status =
        typeof result === 'object' && result && 'status' in result
          ? String(result.status)
          : 'accepted'
      return { status, definitive: isCancelledStatus(status), metadata: { accepted: true, status } }
    },
    async reconcile(operation) {
      if (operation.operation_type === 'cancel_order') {
        const order = await getOrderDetails(Number(operation.provider_target_id))
        const status = order.status || order.shipment_status || ''
        return { status, definitive: isCancelledStatus(status), metadata: { reconciled: true } }
      }
      const tracking = await trackSingle(operation.provider_target_id)
      const status = tracking.tracking_data?.shipment_track?.[0]?.current_status ?? ''
      return { status, definitive: isCancelledStatus(status), metadata: { reconciled: true } }
    },
  }

async function reconcileShiprocketCancellation(
  operation: ProviderOperation,
  lease: ExecutionLease,
  adapter: ProviderMutationAdapter<ShiprocketCancellationObservation>
): Promise<ProviderOperation> {
  try {
    const observation = await adapter.reconcile(operation)
    const providerStatus = observation?.status ?? ''
    if (observation?.definitive) {
      const succeeded = await recordOutcome(operation.id, 'provider_succeeded', lease, {
        providerStatus,
        metadata: observation.metadata,
      })
      return finalizeOperation(succeeded, lease)
    }
    const nextState = operation.reconciliation_attempts >= 2 ? 'manual_review' : 'outcome_unknown'
    const reconciled = await recordOutcome(operation.id, nextState, lease, {
      providerStatus: providerStatus || 'inconclusive',
      errorClassification: 'CANCELLATION_NOT_CONFIRMED',
      manualReviewReason:
        nextState === 'manual_review'
          ? 'Shiprocket cancellation could not be confirmed without another mutation'
          : undefined,
      metadata: { reconciled: true },
    })
    if (nextState === 'manual_review') {
      await persistOperationAlert(
        reconciled,
        'provider_operation_manual_review',
        'Shiprocket cancellation could not be confirmed; automatic replay is disabled'
      )
    }
    return reconciled
  } catch (error) {
    const nextState = operation.reconciliation_attempts >= 2 ? 'manual_review' : 'outcome_unknown'
    const reconciled = await recordOutcome(operation.id, nextState, lease, {
      errorClassification: 'CANCELLATION_RECONCILIATION_UNAVAILABLE',
      manualReviewReason:
        nextState === 'manual_review'
          ? 'Shiprocket cancellation reconciliation remained unavailable'
          : undefined,
      metadata: { message: error instanceof Error ? error.message.slice(0, 500) : 'unknown' },
    })
    if (nextState === 'manual_review') {
      await persistOperationAlert(
        reconciled,
        'provider_operation_manual_review',
        'Shiprocket cancellation could not be reconciled; automatic replay is disabled'
      )
    }
    return reconciled
  }
}

async function dispatchShiprocketCancellation(
  operation: ProviderOperation,
  lease: ExecutionLease,
  adapter: ProviderMutationAdapter<ShiprocketCancellationObservation>
): Promise<ProviderOperation> {
  const dispatching = await claimDispatch(operation.id, lease)
  let observation: ShiprocketCancellationObservation
  try {
    observation = await adapter.mutate(dispatching)
  } catch (error) {
    const state = cancellationFailureIsDefinitive(error) ? 'provider_failed' : 'outcome_unknown'
    const recorded = await recordOutcome(dispatching.id, state, lease, {
      errorClassification:
        state === 'provider_failed' ? 'PROVIDER_REJECTED' : 'AMBIGUOUS_PROVIDER_RESPONSE',
      metadata: { message: error instanceof Error ? error.message.slice(0, 500) : 'unknown' },
    })
    if (state === 'outcome_unknown') {
      return reconcileShiprocketCancellation(recorded, lease, adapter)
    }
    return recorded
  }
  if (observation.definitive) {
    const succeeded = await recordOutcome(dispatching.id, 'provider_succeeded', lease, {
      providerStatus: observation.status,
      metadata: observation.metadata,
    })
    return finalizeOperation(succeeded, lease)
  }
  const pending = await recordOutcome(dispatching.id, 'provider_pending', lease, {
    providerStatus: observation.status || 'accepted',
    metadata: observation.metadata,
  })
  return reconcileShiprocketCancellation(pending, lease, adapter)
}

export async function cancelOrderWithProviderSafety(
  orderId: string,
  cause: string,
  adapter: ProviderMutationAdapter<ShiprocketCancellationObservation> = shiprocketCancellationAdapter
): Promise<{ cancellation: ProviderOperation; refund: ProviderOperation | null }> {
  const prepared = await withExecutionLease('fulfillment_order', orderId, ({ lease }) =>
    prepareShiprocketCancellation(orderId, cause, lease)
  )
  const cancellation = await withExecutionLease(
    'provider_operation',
    prepared.id,
    async ({ lease }) => {
      const current = await loadOperation(prepared.id)
      if (current.local_applied_at) return current
      if (current.state === 'prepared') {
        return dispatchShiprocketCancellation(current, lease, adapter)
      }
      if (current.state === 'provider_succeeded') return finalizeOperation(current, lease)
      if (current.state === 'dispatching' || current.state === 'outcome_unknown') {
        return reconcileShiprocketCancellation(current, lease, adapter)
      }
      return current
    }
  )

  let refund: ProviderOperation | null = null
  if (cancellation.local_applied_at) {
    try {
      refund = await prepareFullRefund(orderId, `Refund after Shiprocket cancellation: ${cause}`)
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'PAYMENT_NOT_REFUNDABLE') throw error
    }
    if (refund && !refund.local_applied_at && refund.state !== 'provider_failed') {
      try {
        refund = await dispatchRazorpayRefund(refund.id)
      } catch (error) {
        logger.error({ error, orderId, operationId: refund.id }, 'Cancellation refund is pending')
        refund = await loadOperation(refund.id)
      }
    }
  }
  return { cancellation, refund }
}

export async function reconcileProviderOperation(
  operationId: string,
  options: {
    allowRefundReplay?: boolean
    refundAdapter?: ProviderMutationAdapter<RefundRecord>
    cancellationAdapter?: ProviderMutationAdapter<ShiprocketCancellationObservation>
  } = {}
): Promise<ProviderOperation> {
  return withExecutionLease('provider_operation', operationId, async ({ lease }) => {
    const operation = await loadOperation(operationId)
    if (operation.local_applied_at) return operation
    if (operation.state === 'provider_succeeded') return finalizeOperation(operation, lease)
    if (operation.provider === 'razorpay') {
      return reconcileRefund(
        operation,
        lease,
        options.allowRefundReplay === true &&
          (operation.state === 'dispatching' || operation.state === 'outcome_unknown'),
        options.refundAdapter ?? razorpayRefundAdapter
      )
    }
    return reconcileShiprocketCancellation(
      operation,
      lease,
      options.cancellationAdapter ?? shiprocketCancellationAdapter
    )
  })
}

export async function reconcileActionableProviderOperations(limit = 20): Promise<number> {
  const { data, error } = await adminSupabase
    .from('provider_operations')
    .select('id')
    .is('local_applied_at', null)
    .in('state', ['dispatching', 'outcome_unknown', 'provider_pending', 'provider_succeeded'])
    .order('updated_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)))
  if (error) {
    throw databaseError(
      'provider_operations.load_actionable',
      error,
      'Provider operations could not be loaded'
    )
  }
  let reconciled = 0
  for (const row of data ?? []) {
    try {
      await reconcileProviderOperation(row.id as string, { allowRefundReplay: true })
      reconciled += 1
    } catch (error) {
      if (error instanceof AppError && error.code === 'EXECUTION_ALREADY_CLAIMED') continue
      logger.error({ error, operationId: row.id }, 'Provider operation reconciliation failed')
    }
  }
  return reconciled
}

export async function processLateCaptureWatches(limit = 20): Promise<number> {
  const { data, error } = await adminSupabase
    .from('late_capture_watches')
    .select('order_id, razorpay_order_id, expected_amount_paisa, currency')
    .in('status', ['open', 'manual_review'])
    .order('updated_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)))
  if (error) {
    throw databaseError(
      'provider_operations.load_late_capture_watches',
      error,
      'Late capture watches could not be loaded'
    )
  }

  let processed = 0
  for (const watch of data ?? []) {
    try {
      const providerOrder = await razorpay.orders.fetch(watch.razorpay_order_id as string)
      if (
        providerOrder.id !== watch.razorpay_order_id ||
        Number(providerOrder.amount) !== watch.expected_amount_paisa ||
        providerOrder.currency !== watch.currency ||
        providerOrder.status !== 'paid' ||
        Number(providerOrder.amount_paid) !== watch.expected_amount_paisa
      ) {
        continue
      }
      const providerPayments = await razorpay.orders.fetchPayments(
        watch.razorpay_order_id as string
      )
      const captured = providerPayments.items.find(
        (payment) =>
          payment.order_id === watch.razorpay_order_id &&
          payment.status === 'captured' &&
          payment.captured === true &&
          Number(payment.amount) === watch.expected_amount_paisa &&
          payment.currency === watch.currency
      )
      if (!captured) continue
      await withExecutionLease('checkout_payment', watch.order_id as string, ({ lease }) =>
        handleLateCapture(
          {
            orderId: watch.order_id as string,
            razorpayOrderId: watch.razorpay_order_id as string,
            razorpayPaymentId: captured.id,
            amountPaisa: Number(captured.amount),
            currency: captured.currency,
          },
          lease
        )
      )
      processed += 1
    } catch (error) {
      if (error instanceof AppError && error.code === 'EXECUTION_ALREADY_CLAIMED') continue
      logger.error({ error, orderId: watch.order_id }, 'Late capture watch check failed')
    }
  }
  return processed
}

export async function assertFulfillmentMutationAllowed(
  orderId: string,
  lease: ExecutionLease
): Promise<void> {
  const { error } = await adminSupabase.rpc('assert_fulfillment_mutation_allowed', {
    ...executionLeaseRpcArgs(lease),
    p_order_id: orderId,
  })
  if (error) {
    throw new AppError(
      409,
      'CANCELLATION_IN_PROGRESS',
      'Fulfillment is frozen while cancellation is unresolved'
    )
  }
}

export async function withFulfillmentMutationLease<T>(
  orderId: string,
  work: (lease: ExecutionLease) => Promise<T>
): Promise<T> {
  return withExecutionLease('fulfillment_order', orderId, async ({ lease }) => {
    await assertFulfillmentMutationAllowed(orderId, lease)
    return work(lease)
  })
}

export async function auditProviderAction(input: {
  operationId?: string
  orderId?: string
  actorId: string
  action: string
  reason: string
  outcome: 'success' | 'no_change' | 'failed'
  details?: Record<string, unknown>
}): Promise<void> {
  const { error } = await adminSupabase.rpc('audit_provider_operation_action', {
    p_operation_id: input.operationId ?? null,
    p_order_id: input.orderId ?? null,
    p_actor_id: input.actorId,
    p_action: input.action,
    p_reason: input.reason,
    p_outcome: input.outcome,
    p_details: input.details ?? {},
  })
  if (error) {
    throw databaseError('provider_operations.audit', error, 'Provider action audit failed')
  }
}
