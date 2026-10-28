import { adminSupabase } from '../lib/supabase/admin'
import { AppError, type ProviderOperation } from '../types'
import { databaseError } from '../lib/databaseError'
import { executionLeaseRpcArgs, withExecutionLease, type ExecutionLease } from './executionLease'
import {
  createOrder,
  assignAwb,
  schedulePickup,
  getOrderDetails,
  getShipmentDetails,
  findOrdersByMerchantReference,
  submitNdrAction,
  getNdrDetails,
  type ShiprocketOrderInput,
  type ShiprocketError,
} from './shiprocket'

type ShippingOperationType = 'create_order' | 'assign_awb' | 'schedule_pickup' | 'ndr_action'
interface FrozenShippingRequest {
  wire: Record<string, unknown>
  episode_id?: string
  request_id?: string
  actor_id?: string
}

export function isShippingOperation(operation: Pick<ProviderOperation, 'operation_type'>): boolean {
  return ['create_order', 'assign_awb', 'schedule_pickup', 'ndr_action'].includes(
    operation.operation_type
  )
}

export function shippingOperationDto(operation: ProviderOperation) {
  return {
    id: operation.id,
    order_id: operation.order_id,
    operation_type: operation.operation_type,
    state: operation.state,
    provider_status: operation.provider_status,
    local_applied_at: operation.local_applied_at,
    error_classification: operation.error_classification,
    manual_review_reason: operation.manual_review_reason,
  }
}

async function loadOperation(id: string): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase
    .from('provider_operations')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data)
    throw databaseError('shipping.load_operation', error, 'Shipping operation unavailable')
  return data as ProviderOperation
}

async function frozenRequest(operation: ProviderOperation): Promise<FrozenShippingRequest> {
  const { data, error } = await adminSupabase
    .from('shipping_operation_requests')
    .select('request')
    .eq('operation_id', operation.id)
    .single()
  if (error || !data)
    throw databaseError('shipping.load_request', error, 'Frozen shipping request unavailable')
  return data.request as FrozenShippingRequest
}

async function record(
  operation: ProviderOperation,
  lease: ExecutionLease,
  state:
    | 'provider_succeeded'
    | 'provider_pending'
    | 'provider_failed'
    | 'manual_review'
    | 'outcome_unknown',
  metadata: Record<string, unknown>
) {
  const { data, error } = await adminSupabase.rpc('record_provider_operation_result', {
    ...executionLeaseRpcArgs(lease),
    p_operation_id: operation.id,
    p_state: state,
    p_provider_operation_id: null,
    p_provider_status: state === 'provider_pending' ? 'request accepted' : state,
    p_response_metadata: metadata,
    p_error_classification:
      state === 'manual_review'
        ? 'AMBIGUOUS_SHIPPING_OUTCOME'
        : state === 'provider_failed'
          ? 'PROVIDER_REJECTED'
          : null,
    p_manual_review_reason:
      state === 'manual_review'
        ? 'Provider result is inconclusive. Inspect the frozen request and provider account; do not repeat the mutation.'
        : null,
  })
  if (error || !data)
    throw databaseError(
      'shipping.record_result',
      error,
      'Shipping outcome requires reconciliation',
      { statusCode: 503 }
    )
  return data as ProviderOperation
}

function operationArgs(
  operation: ProviderOperation,
  lease: ExecutionLease,
  fulfillment: ExecutionLease
) {
  return {
    ...executionLeaseRpcArgs(lease),
    p_order_id: operation.order_id,
    p_operation_id: operation.id,
    p_fulfillment_owner_token: fulfillment.ownerToken,
    p_fulfillment_fencing_token: fulfillment.fencingToken,
  }
}

async function finalize(
  operation: ProviderOperation,
  lease: ExecutionLease,
  fulfillment: ExecutionLease
) {
  const { data, error } = await adminSupabase.rpc(
    'finalize_shipping_operation',
    operationArgs(operation, lease, fulfillment)
  )
  if (error || !data)
    throw databaseError(
      'shipping.finalize',
      error,
      'Shipping succeeded; local application awaits reconciliation',
      { statusCode: 503 }
    )
  return data as ProviderOperation
}

async function mutate(
  operation: ProviderOperation,
  request: FrozenShippingRequest
): Promise<Record<string, unknown>> {
  if (operation.operation_type === 'create_order') {
    const result = await createOrder(request.wire as unknown as ShiprocketOrderInput)
    return { shiprocket_order_id: String(result.order_id), shipment_id: String(result.shipment_id) }
  }
  if (operation.operation_type === 'assign_awb') {
    const result = await assignAwb(request.wire as unknown as Parameters<typeof assignAwb>[0])
    const data = result.response?.data
    if (
      !data?.awb_code ||
      Number(data.shipment_id) !== Number(operation.provider_target_id) ||
      String(data.order_id) !== operation.provider_generation?.split(':')[0] ||
      Number(data.courier_company_id) !== Number(request.wire['courier_id'])
    )
      throw new Error('AWB result identity mismatch')
    return {
      awb_code: data.awb_code,
      courier_name: data.courier_name,
      courier_id: Number(data.courier_company_id),
    }
  }
  if (operation.operation_type === 'schedule_pickup') {
    return (await schedulePickup(request.wire as unknown as Parameters<typeof schedulePickup>[0]))
      .response as unknown as Record<string, unknown>
  }
  if (operation.operation_type === 'ndr_action') {
    const current = (await getNdrDetails(operation.provider_target_id)).sort(
      (a, b) => b.attempts - a.attempts
    )[0]
    if (
      !current ||
      current.episode_id !== request.episode_id ||
      current.shipment_id !== operation.provider_generation?.split(':')[1]
    )
      throw new Error('NDR episode changed before dispatch')
    return submitNdrAction(
      operation.provider_target_id,
      request.wire as unknown as Parameters<typeof submitNdrAction>[1]
    )
  }
  throw new Error('Unsupported shipping mutation')
}

async function reconcile(
  operation: ProviderOperation,
  request: FrozenShippingRequest
): Promise<Record<string, unknown> | null> {
  if (operation.operation_type === 'create_order') {
    const candidates = await findOrdersByMerchantReference(operation.provider_target_id)
    if (candidates.length !== 1) return null
    const order = await getOrderDetails(candidates[0]!.order_id)
    if (
      order.merchant_order_id !== operation.provider_target_id ||
      order.currency !== 'INR' ||
      order.total_paisa !== Math.round(Number(request.wire['sub_total']) * 100) ||
      order.customer_pincode !== String(request.wire['shipping_pincode']) ||
      order.payment_method.toLowerCase() !== 'prepaid' ||
      !Number.isSafeInteger(order.shipment_id) ||
      order.shipment_id <= 0
    )
      return null
    const rawItems = (order as unknown as Record<string, unknown>)['products']
    if (!Array.isArray(rawItems) || !Array.isArray(request.wire['order_items'])) return null
    const itemKey = (row: Record<string, unknown>) =>
      `${row['sku']}:${Number(row['quantity'] ?? row['units'])}:${Math.round(Number(row['selling_price'] ?? row['price']) * 100)}`
    const expected = (request.wire['order_items'] as Record<string, unknown>[]).map(itemKey).sort()
    if (JSON.stringify(rawItems.map(itemKey).sort()) !== JSON.stringify(expected)) return null
    return { shiprocket_order_id: String(order.order_id), shipment_id: String(order.shipment_id) }
  }
  if (operation.operation_type === 'assign_awb' || operation.operation_type === 'schedule_pickup') {
    const shipment = await getShipmentDetails(Number(operation.provider_target_id))
    const expectedOrder = operation.provider_generation?.split(':')[0]
    if (
      String(shipment.id) !== operation.provider_target_id ||
      String(shipment.order_id) !== expectedOrder
    )
      return null
    if (operation.operation_type === 'assign_awb' && shipment.awb) {
      const courierId = Number((shipment as unknown as Record<string, unknown>)['courier_id'])
      if (courierId !== Number(request.wire['courier_id'])) return null
      return { awb_code: shipment.awb, courier_name: shipment.courier, courier_id: courierId }
    }
    if (operation.operation_type === 'schedule_pickup' && shipment.pickup_scheduled_date)
      return {
        pickup_scheduled_date: shipment.pickup_scheduled_date,
        pickup_token_number: shipment.pickup_token_number,
      }
  }
  return null
}

export async function dispatchShippingOperation(
  operationId: string,
  fulfillmentLease?: ExecutionLease
): Promise<ProviderOperation> {
  const initial = await loadOperation(operationId)
  if (!isShippingOperation(initial))
    throw new AppError(409, 'INVALID_SHIPPING_OPERATION', 'Unsupported shipping operation')
  if (!fulfillmentLease)
    return withExecutionLease('fulfillment_order', initial.order_id, ({ lease }) =>
      dispatchShippingOperation(operationId, lease)
    )
  return withExecutionLease('provider_operation', operationId, async ({ lease, assertOwned }) => {
    let operation = await loadOperation(operationId)
    if (
      operation.local_applied_at ||
      ['provider_failed', 'manual_review'].includes(operation.state)
    )
      return operation
    const request = await frozenRequest(operation)
    if (operation.state === 'provider_succeeded')
      return finalize(operation, lease, fulfillmentLease)
    if (operation.state === 'provider_pending' && operation.operation_type === 'ndr_action')
      return operation
    if (operation.state === 'prepared') {
      const claimed = await adminSupabase.rpc(
        'claim_shipping_operation',
        operationArgs(operation, lease, fulfillmentLease)
      )
      if (claimed.error || !claimed.data)
        throw databaseError(
          'shipping.claim',
          claimed.error,
          'Shipping operation cannot be dispatched',
          { statusCode: 409 }
        )
      operation = claimed.data as ProviderOperation
      let result: Record<string, unknown>
      try {
        await assertOwned()
        result = await mutate(operation, request)
      } catch (error) {
        if (
          (error as Partial<ShiprocketError>).type === 'BAD_REQUEST' &&
          (error as Partial<ShiprocketError>).statusCode !== 404
        )
          return record(operation, lease, 'provider_failed', {})
        // The dispatching intent is durable even if this write or process fails.
        operation = await record(operation, lease, 'outcome_unknown', {})
        let recovered: Record<string, unknown> | null = null
        try {
          recovered = await reconcile(operation, request)
        } catch {
          /* Review retains the durable dispatch intent. */
        }
        return recovered
          ? finalize(
              await record(operation, lease, 'provider_succeeded', recovered),
              lease,
              fulfillmentLease
            )
          : record(operation, lease, 'manual_review', {})
      }
      operation = await record(
        operation,
        lease,
        operation.operation_type === 'ndr_action' ? 'provider_pending' : 'provider_succeeded',
        result
      )
      return operation.state === 'provider_succeeded'
        ? finalize(operation, lease, fulfillmentLease)
        : operation
    }
    let result: Record<string, unknown> | null = null
    try {
      result = await reconcile(operation, request)
    } catch {
      /* Inconclusive reads require review, never a mutation replay. */
    }
    if (!result) return record(operation, lease, 'manual_review', {})
    return finalize(
      await record(operation, lease, 'provider_succeeded', result),
      lease,
      fulfillmentLease
    )
  })
}

export async function runShippingOperation(
  orderId: string,
  type: ShippingOperationType,
  request: FrozenShippingRequest,
  fulfillmentLease: ExecutionLease,
  cause: string,
  correctedAttempt?: string
): Promise<ProviderOperation> {
  const { data, error } = await adminSupabase.rpc('prepare_shipping_operation', {
    ...executionLeaseRpcArgs(fulfillmentLease),
    p_order_id: orderId,
    p_operation_type: type,
    p_request: request,
    p_cause: cause,
    p_corrected_attempt: correctedAttempt ?? null,
  })
  if (error || !data)
    throw databaseError('shipping.prepare', error, 'Shipping intent could not be prepared', {
      statusCode: 409,
    })
  const operation = await dispatchShippingOperation(
    (data as ProviderOperation).id,
    fulfillmentLease
  )
  if (type !== 'ndr_action' && !operation.local_applied_at)
    throw new AppError(
      409,
      'SHIPPING_REVIEW_REQUIRED',
      'Shipping operation requires review before another mutation'
    )
  return operation
}
