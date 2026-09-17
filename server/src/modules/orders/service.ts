import { adminSupabase } from '../../lib/supabase/admin'
import { databaseError, isPostgrestNoRows } from '../../lib/databaseError'
import { AppError } from '../../types'
import type { AdminOrderSummary, Order } from '../../types'
import { invalidateOn } from '../../services/cacheInvalidation'
import { executionLeaseRpcArgs, type ExecutionLease } from '../../services/executionLease'
import {
  trackBulk,
  createOrder as shiprocketCreateOrder,
  assignAwb as shiprocketAssignAwb,
  schedulePickup as shiprocketSchedulePickup,
  generateLabel as shiprocketGenerateLabel,
  generateManifest as shiprocketGenerateManifest,
  cancelOrder as shiprocketCancelOrder,
  cancelShipment as shiprocketCancelShipment,
  getPickupLocations as shiprocketGetPickupLocations,
  getShipmentDetails as shiprocketGetShipmentDetails,
  generateInvoice as shiprocketGenerateInvoice,
} from '../../services/shiprocket'
import { logger } from '../../lib/logger'
import { emitStatusChangeEvents } from '../../services/eventBus'
import { shiprocketStatusToOrderStatus, isValidTransition } from './stateMachine'
import type {
  ListOrdersQuery,
  AdminListOrdersQuery,
  UpdateOrderStatusInput,
  UpdateFulfillmentInput,
  AddOrderNoteInput,
  AssignAwbInput,
  FulfillOrderInput,
} from './schema'

//
// User-facing: only see own orders
//

export async function listUserOrders(
  userId: string,
  query: ListOrdersQuery
): Promise<{
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit, status, payment_status } = query
  const offset = (page - 1) * limit

  let dbQuery = adminSupabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    // Layer 2 ownership enforcement - always filter by userId from JWT
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) dbQuery = dbQuery.eq('status', status)
  if (payment_status) dbQuery = dbQuery.eq('payment_status', payment_status)

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw databaseError('orders.list', error, 'Failed to fetch orders')

  const orders = (data as Order[]) ?? []

  return {
    orders,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getUserOrder(userId: string, orderId: string): Promise<Order> {
  const { data, error } = await adminSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    // Layer 2 ownership: both conditions must match
    .eq('user_id', userId)
    .single()

  // Return 404 whether the order doesn't exist OR belongs to another user
  // Never reveal that the order exists for a different user (prevent enumeration)
  if (error && !isPostgrestNoRows(error))
    throw databaseError('orders.get_owned', error, 'Failed to fetch order')
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  // Return from DB only — tracking is synced by webhooks + cron polling
  return data as Order
}

//
// Admin: see all orders, update status/fulfillment
//

export async function adminListOrders(query: AdminListOrdersQuery): Promise<{
  orders: AdminOrderSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit, status, payment_status, fulfillment_status, q, from_date, to_date } = query
  const offset = (page - 1) * limit

  let dbQuery = adminSupabase
    .from('orders')
    .select(
      `
      id, order_number, user_id, status, payment_status, fulfillment_status,
      subtotal_paisa, discount_amount_paisa, shipping_amount_paisa, tax_amount_paisa, total_amount_paisa,
      coupon_code, coupon_discount_paisa,
      shipping_full_name, shipping_phone, shipping_city, shipping_state, shipping_pincode, contact_email,
      awb_code, notes,
      created_at, updated_at,
      profiles ( email, full_name, phone )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status) dbQuery = dbQuery.eq('status', status)
  if (payment_status) dbQuery = dbQuery.eq('payment_status', payment_status)
  if (fulfillment_status) dbQuery = dbQuery.eq('fulfillment_status', fulfillment_status)
  if (from_date) dbQuery = dbQuery.gte('created_at', from_date)
  if (to_date) dbQuery = dbQuery.lte('created_at', to_date)
  if (q) {
    const searchTerm = q.replace(/[(),]/g, ' ').trim()
    dbQuery = dbQuery.or(`order_number.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`)
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw databaseError('orders.admin_list', error, 'Failed to fetch orders')

  return {
    orders: (data as unknown as AdminOrderSummary[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function adminGetOrder(orderId: string): Promise<Order> {
  const { data, error } = await adminSupabase
    .from('orders')
    .select(
      `
      *,
      order_items(*),
      profiles ( email, full_name, phone ),
      payments ( id, razorpay_order_id, razorpay_payment_id, amount_paisa, status, captured_at )
    `
    )
    .eq('id', orderId)
    .single()

  if (error && !isPostgrestNoRows(error))
    throw databaseError('orders.admin_get', error, 'Failed to fetch order')
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  // Return from DB only — tracking is synced by webhooks + cron polling
  return data as unknown as Order
}

export async function adminUpdateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<Order> {
  const { data: current, error } = await adminSupabase
    .from('orders')
    .select('status, user_id')
    .eq('id', orderId)
    .single()

  if (error && !isPostgrestNoRows(error))
    throw databaseError('orders.get_status', error, 'Failed to fetch order status')
  if (!current) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const oldStatus = current.status as string
  const newStatus = input.status

  if (!isValidTransition(oldStatus, newStatus)) {
    logger.warn(
      { orderId, oldStatus, newStatus, source: 'admin_manual' },
      'Admin performing non-standard status transition'
    )
  }

  await transitionOrderStatus(
    {
      id: orderId,
      status: oldStatus,
      user_id: current.user_id,
    },
    newStatus,
    'admin_manual'
  )

  return adminGetOrder(orderId)
}

export async function adminUpdateFulfillment(
  orderId: string,
  input: UpdateFulfillmentInput
): Promise<Order> {
  // An AWB confirms allocation, not carrier handoff.
  const fulfillment_status =
    input.awb_code != null && input.awb_code.trim() !== '' ? 'partial' : 'unfulfilled'

  const { data, error } = await adminSupabase
    .from('orders')
    .update({
      awb_code: input.awb_code ?? null,
      fulfillment_status,
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error && !isPostgrestNoRows(error))
    throw databaseError('orders.update_fulfillment', error, 'Failed to update fulfillment')
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  return adminGetOrder(orderId)
}

export async function adminAddOrderNote(orderId: string, input: AddOrderNoteInput): Promise<Order> {
  // Append to existing notes (newline-separated)
  const { data: existing, error: existingError } = await adminSupabase
    .from('orders')
    .select('notes')
    .eq('id', orderId)
    .single()

  if (existingError && !isPostgrestNoRows(existingError))
    throw databaseError('orders.get_notes', existingError, 'Failed to fetch order notes')
  if (!existing) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const timestamp = new Date().toISOString()
  const noteEntry = `[${timestamp}] ${input.note}`
  const updatedNotes = existing.notes ? `${existing.notes}\n${noteEntry}` : noteEntry

  const { data, error } = await adminSupabase
    .from('orders')
    .update({ notes: updatedNotes })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw databaseError('orders.add_note', error, 'Failed to add note')
  if (!data) throw new AppError(500, 'DB_ERROR', 'Failed to add note')
  return adminGetOrder(orderId)
}

export async function updateOrderStatusByAwb(
  awbCode: string,
  status: string,
  source: 'webhook' | 'polling_sync' = 'polling_sync'
): Promise<Order | null> {
  const { data: order, error: fetchError } = await adminSupabase
    .from('orders')
    .select('id, user_id, status')
    .eq('awb_code', awbCode)
    .maybeSingle()

  if (fetchError)
    throw databaseError('orders.fetch_by_awb', fetchError, 'Failed to fetch order by AWB')
  if (!order) return null

  if (order.status !== status) {
    if (!isValidTransition(order.status, status)) {
      logger.warn(
        { orderId: order.id, awb: awbCode, from: order.status, to: status, source },
        'Auto-sync: blocked invalid status transition'
      )
      return null
    }

    return transitionOrderStatus(order, status, source, { awbCode })
  }

  return order as unknown as Order
}

export function mapShiprocketStatusToOrderStatus(shiprocketStatus?: string): string | null {
  return shiprocketStatusToOrderStatus(shiprocketStatus)
}

export async function transitionOrderStatus(
  order: { id: string; status: string; user_id: string; order_number?: string },
  newStatus: string,
  source: 'webhook' | 'polling_sync' | 'admin_manual' | 'system',
  metadata?: Record<string, unknown>,
  executionLease?: ExecutionLease
): Promise<Order> {
  if (order.status === newStatus) return order as unknown as Order

  const { data, error } = await adminSupabase.rpc(
    executionLease ? 'transition_order_status_fenced' : 'transition_order_status',
    {
      ...(executionLease ? executionLeaseRpcArgs(executionLease) : {}),
      p_order_id: order.id,
      p_expected_status: order.status,
      p_new_status: newStatus,
      p_source: source,
      p_actor_id: null,
      p_metadata: metadata ?? null,
    }
  )

  if (error || !data) {
    throw new AppError(
      409,
      'ORDER_TRANSITION_FAILED',
      error?.message ?? 'Order transition did not return an updated order'
    )
  }

  invalidateOn('ORDER_UPDATED', { id: order.id, userId: order.user_id })
  emitStatusChangeEvents({
    orderId: order.id,
    orderNumber: order.order_number,
    userId: order.user_id,
    oldStatus: order.status,
    newStatus,
    source,
    awbCode: (metadata?.['awbCode'] as string | undefined) ?? null,
    courierName: (metadata?.['courierName'] as string | undefined) ?? null,
  })

  return data as unknown as Order
}

export async function adminSyncTrackingOrders(): Promise<{
  totalChecked: number
  totalUpdated: number
}> {
  const { data: orders, error } = await adminSupabase
    .from('orders')
    .select('id, awb_code, status')
    .not('awb_code', 'is', null)
    .not('status', 'in', '("delivered","cancelled","returned","refunded","lost","damaged")')

  if (error || !orders || orders.length === 0) {
    return { totalChecked: 0, totalUpdated: 0 }
  }

  const awbs = orders
    .map((o) => o.awb_code)
    .filter((awb): awb is string => typeof awb === 'string' && awb.trim() !== '')

  if (awbs.length === 0) {
    return { totalChecked: 0, totalUpdated: 0 }
  }

  const trackingData = await trackBulk(awbs)

  let totalUpdated = 0

  for (const order of orders) {
    const awb = order.awb_code
    if (!awb) continue

    const item = trackingData[awb]
    const trackingInfo = item?.tracking_data?.shipment_track?.[0]
    if (trackingInfo) {
      const srStatus = trackingInfo.current_status
      const targetStatus = shiprocketStatusToOrderStatus(srStatus)
      if (targetStatus && targetStatus !== order.status) {
        const updated = await updateOrderStatusByAwb(awb, targetStatus, 'polling_sync')
        if (updated) {
          totalUpdated++
        }
      }
    }
  }

  return {
    totalChecked: orders.length,
    totalUpdated,
  }
}

//
// Shiprocket Integration - Create order in Shiprocket
//

interface ShiprocketOrderOverrides {
  pickupLocation?: string
  weightGrams?: number
  lengthCm?: number
  breadthCm?: number
  heightCm?: number
}

async function buildShiprocketOrderPayload(
  order: Record<string, unknown>,
  orderItems: Array<{
    product_id: string
    product_name: string
    product_sku: string | null
    quantity: number
    unit_price_paisa: number
  }>,
  overrides: ShiprocketOrderOverrides
) {
  // Resolve weight: override > order.package_weight_grams > compute from products > default 500g
  let weightGrams =
    overrides.weightGrams ?? (order['package_weight_grams'] as number | undefined) ?? 0
  if (weightGrams <= 0) {
    const productIds = orderItems.map((item) => item.product_id).filter(Boolean)
    if (productIds.length > 0) {
      const { data: products } = await adminSupabase
        .from('products')
        .select('id, weight_grams')
        .in('id', productIds)
      if (products && products.length > 0) {
        const weightMap = new Map(products.map((p) => [p.id, p.weight_grams ?? 200]))
        weightGrams = orderItems.reduce(
          (sum, item) => sum + (weightMap.get(item.product_id) ?? 200) * item.quantity,
          0
        )
      }
    }
  }
  if (weightGrams <= 0) weightGrams = 500

  // Resolve dimensions: override > order > site_settings defaults
  const { data: settingsData, error: settingsError } = await adminSupabase
    .from('site_settings')
    .select('value')
    .eq('key', 'shiprocket_settings')
    .single()
  if (settingsError) {
    throw databaseError(
      'orders.load_shiprocket_settings',
      settingsError,
      'Shiprocket settings are unavailable',
      { code: 'SETTINGS_UNAVAILABLE' }
    )
  }
  const defaults = (settingsData?.value as Record<string, number | string>) ?? {}

  const lengthCm =
    overrides.lengthCm ??
    (order['package_length_cm'] as number) ??
    (defaults['default_length_cm'] as number) ??
    15
  const breadthCm =
    overrides.breadthCm ??
    (order['package_breadth_cm'] as number) ??
    (defaults['default_breadth_cm'] as number) ??
    10
  const heightCm =
    overrides.heightCm ??
    (order['package_height_cm'] as number) ??
    (defaults['default_height_cm'] as number) ??
    5
  const pickupLocation =
    overrides.pickupLocation ??
    (order['pickup_location'] as string) ??
    (defaults['pickup_location'] as string) ??
    ''

  if (!pickupLocation.trim()) {
    throw new AppError(400, 'PICKUP_LOCATION_REQUIRED', 'A Shiprocket pickup location is required')
  }

  if (order['payment_status'] !== 'paid') {
    throw new AppError(409, 'ORDER_NOT_PAID', 'Only paid orders can be sent to Shiprocket')
  }

  const contactEmail = String(order['contact_email'] ?? '').trim()
  if (!contactEmail) {
    throw new AppError(409, 'ORDER_EMAIL_REQUIRED', 'The paid order has no contact email snapshot')
  }

  // Build items
  const srItems = orderItems.map((item) => ({
    name: item.product_name,
    sku: item.product_sku ?? item.product_id,
    units: item.quantity,
    selling_price: item.unit_price_paisa / 100,
    discount: 0,
    tax: 0,
  }))

  // Build billing name
  const fullName = (order['shipping_full_name'] as string) ?? 'Customer'
  const nameParts = fullName.trim().split(/\s+/)
  const firstName = nameParts[0] ?? 'Customer'
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  // Build address
  const addr1 = (order['shipping_address_line1'] as string) ?? ''
  const addr2 = (order['shipping_address_line2'] as string) ?? ''
  const fullAddress = addr2 ? `${addr1}, ${addr2}` : addr1

  return {
    order_id: order['order_number'] as string,
    order_date: new Date((order['created_at'] as string) || Date.now()).toISOString().slice(0, 10),
    pickup_location: pickupLocation,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: fullAddress,
    billing_city: order['shipping_city'] as string,
    billing_pincode: order['shipping_pincode'] as string,
    billing_state: order['shipping_state'] as string,
    billing_country: (order['shipping_country'] as string) ?? 'India',
    billing_email: contactEmail,
    billing_phone: order['shipping_phone'] as string,
    shipping_is_billing: true,
    order_items: srItems,
    payment_method: 'Prepaid' as const,
    sub_total: (order['subtotal_paisa'] as number) / 100,
    shipping_charges: ((order['shipping_amount_paisa'] as number) ?? 0) / 100,
    total_discount: ((order['discount_amount_paisa'] as number) ?? 0) / 100,
    length: lengthCm,
    breadth: breadthCm,
    height: heightCm,
    weight: Math.max(weightGrams / 1000, 0.1),
    package_weight_grams: weightGrams,
    package_length_cm: lengthCm,
    package_breadth_cm: breadthCm,
    package_height_cm: heightCm,
  }
}

export async function createShiprocketOrder(
  orderId: string,
  pickupLocationOverride?: string
): Promise<{ shiprocket_order_id: number; shipment_id: number }> {
  return createShiprocketOrderInternal(orderId, { pickupLocation: pickupLocationOverride })
}

async function createShiprocketOrderInternal(
  orderId: string,
  overrides: ShiprocketOrderOverrides = {}
): Promise<{ shiprocket_order_id: number; shipment_id: number }> {
  const { data: order, error } = await adminSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  if (order.shiprocket_order_id && order.shipment_id) {
    logger.info(
      { orderId, shiprocketOrderId: order.shiprocket_order_id },
      'Shiprocket order already exists - reusing'
    )
    const existingResult = {
      shiprocket_order_id: Number(order.shiprocket_order_id),
      shipment_id: Number(order.shipment_id),
    }
    if (order.status === 'confirmed') {
      await transitionOrderStatus(order, 'processing', 'system', existingResult)
    }
    return existingResult
  }

  const orderItems = order.order_items as Array<{
    product_id: string
    product_name: string
    product_sku: string | null
    quantity: number
    unit_price_paisa: number
  }>

  const { error: pendingError } = await adminSupabase
    .from('orders')
    .update({ shiprocket_status: 'pending', shiprocket_error: null })
    .eq('id', orderId)
  if (pendingError)
    throw databaseError(
      'orders.prepare_shiprocket_order',
      pendingError,
      'Failed to prepare Shiprocket order'
    )

  const payload = await buildShiprocketOrderPayload(order, orderItems, overrides)
  let result: Awaited<ReturnType<typeof shiprocketCreateOrder>>
  try {
    result = await shiprocketCreateOrder(payload)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error({ err, orderId }, 'Failed to create Shiprocket order')
    const { error: failurePersistError } = await adminSupabase
      .from('orders')
      .update({ shiprocket_status: 'failed', shiprocket_error: errorMessage })
      .eq('id', orderId)
    if (failurePersistError) {
      logger.error({ orderId, error: failurePersistError }, 'Failed to persist Shiprocket failure')
    }
    throw new AppError(502, 'SHIPROCKET_FAILED', 'Shiprocket order creation failed')
  }

  const rawResult = result as unknown as Record<string, unknown>
  const responseData = rawResult['data'] as Record<string, unknown> | undefined
  const resolved = responseData ?? rawResult
  const shiprocketOrderId = Number(resolved['shiprocket_order_id'] ?? resolved['order_id'])
  const shipmentId = Number(resolved['shipment_id'])

  if (!Number.isSafeInteger(shiprocketOrderId) || !Number.isSafeInteger(shipmentId)) {
    throw new AppError(
      502,
      'SHIPROCKET_INVALID_RESPONSE',
      'Shiprocket returned invalid identifiers'
    )
  }

  const persistence = {
    shiprocket_order_id: String(shiprocketOrderId),
    shipment_id: String(shipmentId),
    shiprocket_status: 'created',
    shiprocket_error: null,
    pickup_location: payload.pickup_location,
    package_weight_grams: payload.package_weight_grams,
    package_length_cm: payload.package_length_cm,
    package_breadth_cm: payload.package_breadth_cm,
    package_height_cm: payload.package_height_cm,
    fulfillment_status: 'partial',
    fulfillment_step: 'order_created',
  }
  const { data: persisted, error: persistenceError } = await adminSupabase
    .from('orders')
    .update(persistence)
    .eq('id', orderId)
    .select('id')
    .single()

  if (persistenceError || !persisted) {
    const { error: retryError } = await adminSupabase.rpc('enqueue_retry_job', {
      p_job_type: 'shiprocket_persist',
      p_reference_id: orderId,
      p_payload: { orderId, persistence },
      p_max_retries: 10,
    })
    if (retryError) {
      logger.error({ orderId, retryError }, 'Failed to enqueue Shiprocket persistence repair')
    }
    throw new AppError(
      500,
      'SHIPROCKET_PERSISTENCE_FAILED',
      'Shiprocket accepted the order, but local persistence failed; reconciliation is queued'
    )
  }

  if (order.status === 'confirmed') {
    await transitionOrderStatus(order, 'processing', 'system', { shiprocketOrderId, shipmentId })
  }

  logger.info({ orderId, shiprocketOrderId, shipmentId }, 'Shiprocket order created successfully')
  return { shiprocket_order_id: shiprocketOrderId, shipment_id: shipmentId }
}

//
// Admin create shipment - validates pickup location, then creates Shiprocket order
//

async function assertPickupLocationConfigured(pickupLocation: string): Promise<void> {
  try {
    const availableLocations = await shiprocketGetPickupLocations()
    const valid = availableLocations.some(
      (location) => location.pickup_location.toLowerCase() === pickupLocation.toLowerCase()
    )
    if (!valid) {
      const names = availableLocations.map((location) => `"${location.pickup_location}"`).join(', ')
      throw new AppError(
        400,
        'INVALID_PICKUP_LOCATION',
        `Invalid pickup location "${pickupLocation}". Available: ${names}`
      )
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(
      502,
      'PICKUP_LOCATIONS_UNAVAILABLE',
      'Pickup locations could not be verified with Shiprocket'
    )
  }
}

export async function adminCreateShipment(orderId: string, pickupLocation: string): Promise<Order> {
  await assertPickupLocationConfigured(pickupLocation)
  await createShiprocketOrder(orderId, pickupLocation)

  return adminGetOrder(orderId)
}

//
// Order Tracking - shipment events for customer-facing view
//

export async function getOrderTracking(
  userId: string,
  orderId: string
): Promise<{
  awb_code: string | null
  tracking_url: string | null
  courier_name: string | null
  shiprocket_status: string | null
  shipment_events: Array<{
    id: string
    status: string
    location: string | null
    remarks: string | null
    event_time: string
  }>
} | null> {
  const { data: order, error } = await adminSupabase
    .from('orders')
    .select('awb_code, tracking_url, courier_name, shiprocket_status, id')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  if (error || !order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  const { data: events, error: eventsError } = await adminSupabase
    .from('shipment_events')
    .select('id, status, location, remarks, event_time')
    .eq('order_id', orderId)
    .order('event_time', { ascending: false })

  if (eventsError) {
    throw new AppError(503, 'TRACKING_UNAVAILABLE', 'Shipment tracking is temporarily unavailable')
  }

  return {
    awb_code: order.awb_code,
    tracking_url: order.tracking_url,
    courier_name: order.courier_name,
    shiprocket_status: order.shiprocket_status,
    shipment_events: (events ?? []).map((e) => ({
      id: e.id,
      status: e.status,
      location: e.location,
      remarks: e.remarks,
      event_time: e.event_time,
    })),
  }
}

//
// Admin Shiprocket Actions
//

async function getOrderShipmentId(
  orderId: string
): Promise<{ shipmentId: number; awbCode: string | null }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('shipment_id, awb_code')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.shipment_id)
    throw new AppError(
      400,
      'NO_SHIPMENT',
      'No Shiprocket shipment_id found. Create a Shiprocket order first.'
    )

  return { shipmentId: Number(order.shipment_id), awbCode: order.awb_code }
}

export async function adminAssignAwb(orderId: string, input: AssignAwbInput): Promise<Order> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  const result = await shiprocketAssignAwb({
    shipment_id: shipmentId,
    courier_id: input.courier_id,
    is_return: 0,
  })

  const awbData = result.response?.data
  if (!awbData?.awb_code) {
    throw new AppError(502, 'AWB_FAILED', 'Shiprocket AWB assignment returned no AWB code')
  }

  await persistFulfillmentState(
    orderId,
    {
      awb_code: awbData.awb_code,
      courier_name: awbData.courier_name ?? null,
      fulfillment_status: 'partial',
      fulfillment_step: 'awb_assigned',
    },
    'AWB was assigned but could not be persisted'
  )

  invalidateOn('ORDER_UPDATED', { id: orderId, userId: '' })

  logger.info({ orderId, awb: awbData.awb_code, courier: awbData.courier_name }, 'AWB assigned')
  return adminGetOrder(orderId)
}

export async function adminSchedulePickup(orderId: string): Promise<{ status: string }> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  const result = await shiprocketSchedulePickup({
    shipment_id: [shipmentId],
  })

  const pickupInfo = result.response?.[0]
  if (!pickupInfo?.status) {
    throw new AppError(502, 'PICKUP_FAILED', 'Shiprocket did not confirm pickup scheduling')
  }
  const pickupStatus = pickupInfo.status
  const pickupDate = pickupInfo.pickup_scheduled_date ?? null
  const pickupToken = pickupInfo.pickup_token_number ?? null
  await persistFulfillmentState(
    orderId,
    {
      pickup_scheduled_date: pickupDate,
      pickup_token_number: pickupToken ? String(pickupToken) : null,
      fulfillment_status: 'partial',
      fulfillment_step: 'pickup_scheduled',
    },
    'Pickup was scheduled but could not be persisted'
  )
  logger.info({ orderId, shipmentId, pickupStatus }, 'Pickup scheduled')
  return { status: pickupStatus }
}

export async function adminGenerateLabel(orderId: string): Promise<Buffer> {
  return adminGenerateDocument(orderId, 'label')
}

export async function adminGenerateManifest(orderId: string): Promise<Buffer> {
  return adminGenerateDocument(orderId, 'manifest')
}

async function adminGenerateDocument(
  orderId: string,
  docType: 'label' | 'manifest'
): Promise<Buffer> {
  const { shipmentId } = await getOrderShipmentId(orderId)
  const name = docType === 'label' ? 'Label' : 'Manifest'

  let docUrl: string | null = null

  if (docType === 'label') {
    docUrl = await tryGenerateOrFetchDocument({
      name,
      generate: () => shiprocketGenerateLabel(shipmentId),
      extractUrl: (resp) => (resp as { label_url: string }).label_url,
    })
  } else {
    docUrl = await tryGenerateOrFetchDocument({
      name,
      generate: () => shiprocketGenerateManifest(shipmentId),
      extractUrl: (resp) => (resp as { manifest_url: string }).manifest_url,
    })
  }

  if (!docUrl) {
    try {
      const shipment = await shiprocketGetShipmentDetails(shipmentId)
      docUrl = docType === 'label' ? (shipment.label_url ?? null) : (shipment.manifest_url ?? null)
    } catch {
      /* ignore */
    }
  }

  if (!docUrl) {
    throw new Error(`Shiprocket did not return a ${name.toLowerCase()} URL`)
  }

  const pdfRes = await fetch(docUrl)
  if (!pdfRes.ok) {
    throw new Error(`Failed to download ${name.toLowerCase()} PDF: ${pdfRes.status}`)
  }
  return Buffer.from(await pdfRes.arrayBuffer())
}

interface DocumentGenerator {
  name: string
  generate: () => Promise<unknown>
  extractUrl: (result: unknown) => string | null
}

async function tryGenerateOrFetchDocument(params: DocumentGenerator): Promise<string | null> {
  try {
    const resp = await params.generate()
    const url = params.extractUrl(resp)
    if (url && url.length > 0) {
      logger.info({ url }, `${params.name} generated`)
      return url
    }
    throw new Error(`${params.name} URL is empty`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('already') || msg.includes('Already') || msg.includes('empty')) {
      logger.info(`${params.name} already generated, fetching from shipment details`)
      return null
    }
    throw err
  }
}

const MAX_INVOICE_BYTES = 10 * 1024 * 1024
const INVOICE_BUCKET = 'invoices'

async function loadInvoiceOrder(orderId: string, userId?: string): Promise<Order> {
  let query = adminSupabase
    .from('orders')
    .select('id, user_id, order_number, payment_status, shiprocket_order_id')
    .eq('id', orderId)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query.single()
  if (error && !isPostgrestNoRows(error))
    throw databaseError('orders.invoice_order', error, 'Failed to fetch order')
  if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (data.payment_status !== 'paid') {
    throw new AppError(409, 'INVOICE_NOT_AVAILABLE', 'Invoice is available only for paid orders')
  }
  if (!data.shiprocket_order_id) {
    throw new AppError(409, 'INVOICE_NOT_READY', 'Invoice is not available before fulfillment')
  }
  if (!/^\d+$/.test(data.shiprocket_order_id)) {
    throw new AppError(409, 'INVOICE_NOT_READY', 'Invoice provider reference is invalid')
  }
  return data as unknown as Order
}

async function readValidatedPdf(response: Response): Promise<Buffer> {
  if (!response.ok) throw new Error(`Invoice download failed with status ${response.status}`)

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim()
  if (contentType !== 'application/pdf')
    throw new Error('Invoice provider returned non-PDF content')

  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_INVOICE_BYTES) throw new Error('Invoice PDF exceeds the size limit')
  if (!response.body) throw new Error('Invoice provider returned an empty response')

  const chunks: Buffer[] = []
  const reader = response.body.getReader()
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_INVOICE_BYTES) {
      await reader.cancel()
      throw new Error('Invoice PDF exceeds the size limit')
    }
    chunks.push(Buffer.from(value))
  }

  return validatePdfBuffer(Buffer.concat(chunks))
}

function validatePdfBuffer(pdf: Buffer): Buffer {
  if (pdf.length > MAX_INVOICE_BYTES) throw new Error('Invoice PDF exceeds the size limit')
  if (pdf.length < 5 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Invoice provider returned an invalid PDF')
  }
  return pdf
}

async function loadStoredInvoice(orderId: string): Promise<Buffer | null> {
  const { data: record, error: recordError } = await adminSupabase
    .from('invoice_records')
    .select('status, object_path')
    .eq('order_id', orderId)
    .maybeSingle()
  if (recordError)
    throw databaseError('orders.read_invoice_state', recordError, 'Failed to read invoice state')
  if (record?.status !== 'ready' || !record.object_path) return null

  const { data, error } = await adminSupabase.storage
    .from(INVOICE_BUCKET)
    .download(record.object_path)
  if (error || !data) {
    logger.warn({ error, orderId }, 'Stored invoice is unavailable; regenerating')
    return null
  }
  if (data.type && data.type !== 'application/pdf') {
    logger.warn({ orderId, contentType: data.type }, 'Stored invoice content type is invalid')
    return null
  }
  return validatePdfBuffer(Buffer.from(await data.arrayBuffer()))
}

async function generateInvoice(
  order: Order,
  executionLease?: ExecutionLease
): Promise<{ orderNumber: string; pdf: Buffer }> {
  const storedInvoice = await loadStoredInvoice(order.id)
  if (storedInvoice) return { orderNumber: order.order_number, pdf: storedInvoice }

  const providerReference = order.shiprocket_order_id as string
  const { error: beginError } = await adminSupabase.rpc(
    executionLease ? 'begin_invoice_generation_fenced' : 'begin_invoice_generation',
    {
      ...(executionLease ? executionLeaseRpcArgs(executionLease) : {}),
      p_order_id: order.id,
      p_provider_reference: providerReference,
    }
  )
  if (beginError)
    throw databaseError(
      'orders.begin_invoice_generation',
      beginError,
      'Failed to start invoice generation'
    )

  try {
    const invoiceResponse = await shiprocketGenerateInvoice([Number(providerReference)])
    if (!invoiceResponse.invoice_url) throw new Error('Shiprocket did not return an invoice URL')

    const response = await fetch(invoiceResponse.invoice_url, {
      signal: AbortSignal.timeout(15_000),
    })
    const pdf = await readValidatedPdf(response)
    const objectPath = `orders/${order.id}.pdf`
    const { error: uploadError } = await adminSupabase.storage
      .from(INVOICE_BUCKET)
      .upload(objectPath, pdf, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Invoice storage failed: ${uploadError.message}`)

    const { error: persistError } = executionLease
      ? await adminSupabase.rpc('finish_invoice_generation_fenced', {
          ...executionLeaseRpcArgs(executionLease),
          p_order_id: order.id,
          p_status: 'ready',
          p_object_path: objectPath,
          p_error: null,
        })
      : await adminSupabase
          .from('invoice_records')
          .update({
            status: 'ready',
            object_path: objectPath,
            generated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('order_id', order.id)
    if (persistError) {
      const { error: cleanupError } = await adminSupabase.storage
        .from(INVOICE_BUCKET)
        .remove([objectPath])
      if (cleanupError) {
        logger.error({ cleanupError, orderId: order.id }, 'Orphaned invoice could not be removed')
      }
      throw new Error(`Invoice state could not be persisted: ${persistError.message}`)
    }

    logger.info({ orderId: order.id }, 'Invoice generated and validated')
    return { orderNumber: order.order_number, pdf }
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason)
    const { error } = executionLease
      ? await adminSupabase.rpc('finish_invoice_generation_fenced', {
          ...executionLeaseRpcArgs(executionLease),
          p_order_id: order.id,
          p_status: 'failed',
          p_object_path: null,
          p_error: message.slice(0, 2000),
        })
      : await adminSupabase
          .from('invoice_records')
          .update({ status: 'failed', last_error: message.slice(0, 2000) })
          .eq('order_id', order.id)
    if (error) logger.error({ error, orderId: order.id }, 'Invoice failure state was not persisted')
    throw reason
  }
}

export async function getCustomerInvoice(
  userId: string,
  orderId: string
): Promise<{ orderNumber: string; pdf: Buffer }> {
  return generateInvoice(await loadInvoiceOrder(orderId, userId))
}

export async function adminGenerateInvoice(
  orderId: string,
  executionLease?: ExecutionLease
): Promise<{ orderNumber: string; pdf: Buffer }> {
  return generateInvoice(await loadInvoiceOrder(orderId), executionLease)
}

export async function adminCancelShiprocketOrder(orderId: string): Promise<{ status: string }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, shiprocket_order_id, status, user_id, order_number')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.shiprocket_order_id)
    throw new AppError(400, 'NO_SHIPROCKET_ORDER', 'No Shiprocket order exists')

  await shiprocketCancelOrder({
    ids: [Number(order.shiprocket_order_id)],
  })

  await transitionRemoteOrderStatus(order, 'cancelled', {
    shiprocketOrderId: order.shiprocket_order_id,
  })
  logger.info(
    { orderId, shiprocketOrderId: order.shiprocket_order_id },
    'Shiprocket order cancelled'
  )
  return { status: 'cancelled' }
}

export async function adminCancelShiprocketShipment(orderId: string): Promise<{ status: string }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('id, awb_code, status, user_id, order_number')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.awb_code)
    throw new AppError(400, 'NO_AWB', 'No AWB code found. Cannot cancel shipment.')

  const result = await shiprocketCancelShipment({
    awbs: [order.awb_code],
  })

  await transitionRemoteOrderStatus(order, 'cancelled', { awbCode: order.awb_code })
  logger.info({ orderId, awb: order.awb_code }, 'Shiprocket shipment cancelled')
  return result
}

//
// Admin Fulfill Order - Orchestrated workflow
// Executes all Shiprocket steps sequentially, saving progress at each step.
// If a step fails, stops and returns error with current progress. Retrying
// resumes from the last successful step.
//

interface FulfillmentStepResult {
  step: string
  status: 'completed' | 'skipped' | 'failed'
  details?: Record<string, unknown>
}

export interface FulfillOrderResult {
  success: boolean
  order: Order
  steps: FulfillmentStepResult[]
  shiprocket_order_id: number | null
  shipment_id: number | null
  awb_code: string | null
  courier_name: string | null
  label_generated: boolean
  manifest_generated: boolean
  pickup_scheduled_date: string | null
  error?: string
  failed_step?: string
}

async function persistFulfillmentState(
  orderId: string,
  update: Record<string, unknown>,
  failureMessage: string
): Promise<void> {
  const { data, error } = await adminSupabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select('id')
    .single()

  if (error || !data) {
    const { error: retryError } = await adminSupabase.rpc('enqueue_retry_job', {
      p_job_type: 'shiprocket_persist',
      p_reference_id: orderId,
      p_payload: { orderId, persistence: update },
      p_max_retries: 10,
    })
    if (retryError) {
      logger.error({ orderId, retryError }, 'Failed to enqueue fulfillment persistence repair')
    }
    throw new Error(`${failureMessage}: ${error?.message ?? 'missing order'}`)
  }
}

async function transitionRemoteOrderStatus(
  order: { id: string; status: string; user_id: string; order_number?: string },
  newStatus: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await transitionOrderStatus(order, newStatus, 'admin_manual', metadata)
  } catch (error) {
    const { error: retryError } = await adminSupabase.rpc('enqueue_retry_job', {
      p_job_type: 'shiprocket_persist',
      p_reference_id: order.id,
      p_payload: {
        orderId: order.id,
        transition: { newStatus, metadata },
      },
      p_max_retries: 10,
    })
    if (retryError) {
      logger.error({ orderId: order.id, retryError }, 'Failed to enqueue remote transition repair')
    }
    throw error
  }
}

export async function adminFulfillOrder(
  orderId: string,
  input: FulfillOrderInput
): Promise<FulfillOrderResult> {
  const steps: FulfillmentStepResult[] = []
  let savedShiprocketOrderId: number | null = null
  let savedShipmentId: number | null = null
  let savedAwbCode: string | null = null
  let savedCourierName: string | null = null
  let savedLabelGenerated = false
  let savedManifestGenerated = false
  let savedPickupDate: string | null = null

  const fail = (step: string, message: string): FulfillOrderResult => ({
    success: false,
    order: null as unknown as Order,
    steps,
    shiprocket_order_id: savedShiprocketOrderId,
    shipment_id: savedShipmentId,
    awb_code: savedAwbCode,
    courier_name: savedCourierName,
    label_generated: savedLabelGenerated,
    manifest_generated: savedManifestGenerated,
    pickup_scheduled_date: savedPickupDate,
    error: message,
    failed_step: step,
  })

  let { data: orderRaw } = await adminSupabase.from('orders').select('*').eq('id', orderId).single()

  if (!orderRaw) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  await assertPickupLocationConfigured(input.pickup_location)

  const currentStep = orderRaw['fulfillment_step'] as string | null
  const FULFILLMENT_STEPS = [
    'idle',
    'order_created',
    'awb_assigned',
    'pickup_scheduled',
    'label_generated',
    'manifest_generated',
    'ready_for_pickup',
  ] as const

  // Returns true if the step should be attempted (hasn't been completed yet).
  // currentStep === null means no steps have been run yet.
  function shouldRunStep(step: string): boolean {
    if (!currentStep) return true
    const currentIdx = FULFILLMENT_STEPS.indexOf(currentStep as (typeof FULFILLMENT_STEPS)[number])
    const stepIdx = FULFILLMENT_STEPS.indexOf(step as (typeof FULFILLMENT_STEPS)[number])
    if (currentIdx === -1 || stepIdx === -1) return true
    return currentIdx < stepIdx
  }

  // Step 1: Create Shiprocket Order
  if (shouldRunStep('order_created')) {
    try {
      const result = await createShiprocketOrderInternal(orderId, {
        pickupLocation: input.pickup_location,
        weightGrams: input.weight_grams,
        lengthCm: input.length_cm,
        breadthCm: input.breadth_cm,
        heightCm: input.height_cm,
      })
      savedShiprocketOrderId = result.shiprocket_order_id
      savedShipmentId = result.shipment_id
      steps.push({
        step: 'order_created',
        status: 'completed',
        details: { shiprocket_order_id: savedShiprocketOrderId, shipment_id: savedShipmentId },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 1 failed: create Shiprocket order')
      steps.push({ step: 'order_created', status: 'failed', details: { error: msg } })
      return fail('order_created', msg)
    }
  } else {
    steps.push({ step: 'order_created', status: 'skipped' })
    // Restore saved state from DB for retry
    savedShiprocketOrderId = orderRaw['shiprocket_order_id']
      ? Number(orderRaw['shiprocket_order_id'])
      : null
    savedShipmentId = orderRaw['shipment_id'] ? Number(orderRaw['shipment_id']) : null
  }

  // Refresh order data
  ;({ data: orderRaw } = await adminSupabase.from('orders').select('*').eq('id', orderId).single())
  const shipmentId = orderRaw?.['shipment_id'] ? Number(orderRaw['shipment_id']) : null
  if (!savedShipmentId && shipmentId) savedShipmentId = shipmentId

  if (!shipmentId) {
    return fail('awb_assigned', 'No shipment ID available — cannot proceed with AWB assignment')
  }

  // Step 2: Assign Courier / Generate AWB
  if (shouldRunStep('awb_assigned')) {
    try {
      const assignResult = await shiprocketAssignAwb({
        shipment_id: shipmentId,
        courier_id: input.courier_id,
        is_return: 0,
      })
      // Shiprocket AWB response: { awb_assign_status, response: { data: { awb_code, courier_name, ... } } }
      const rawAssign = assignResult as unknown as Record<string, unknown>
      const respObj = rawAssign['response'] as Record<string, unknown> | undefined
      const respData = respObj?.['data'] as Record<string, unknown> | undefined

      let awbData: { awb_code?: string; courier_name?: string } | undefined = (
        respData?.awb_code ? respData : undefined
      ) as { awb_code?: string; courier_name?: string } | undefined

      // Fallback: response might be wrapped in a top-level 'data' key
      if (!awbData?.awb_code) {
        const topData = rawAssign['data'] as Record<string, unknown> | undefined
        if (topData) {
          const innerResp = topData['response'] as Record<string, unknown> | undefined
          const innerData = innerResp?.['data'] as Record<string, unknown> | undefined
          if (innerData?.awb_code)
            awbData = innerData as { awb_code?: string; courier_name?: string }
        }
      }

      // Final fallback: check if awb_code is directly on respData or resp array
      if (!awbData?.awb_code) {
        const respArr = respObj
          ? ([respObj] as Record<string, unknown>[])
          : (rawAssign['response'] as Record<string, unknown>[] | undefined)
        if (respArr && respArr.length > 0) {
          awbData = respArr[0] as { awb_code?: string; courier_name?: string }
        }
      }

      logger.info(
        { orderId, shipmentId, assignResp: JSON.stringify(rawAssign) },
        'AWB assignment response'
      )

      if (!awbData?.awb_code) {
        throw new Error(
          'Shiprocket AWB assignment returned no AWB code. The order may need manual processing in the Shiprocket dashboard.'
        )
      }
      savedAwbCode = awbData.awb_code
      savedCourierName = awbData.courier_name ?? null
      await persistFulfillmentState(
        orderId,
        {
          awb_code: savedAwbCode,
          courier_name: savedCourierName,
          fulfillment_status: 'partial',
          fulfillment_step: 'awb_assigned',
        },
        'AWB was assigned but could not be persisted'
      )
      steps.push({
        step: 'awb_assigned',
        status: 'completed',
        details: { awb_code: savedAwbCode, courier_name: savedCourierName },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 2 failed: assign AWB')
      steps.push({ step: 'awb_assigned', status: 'failed', details: { error: msg } })
      return fail('awb_assigned', msg)
    }
  } else {
    steps.push({ step: 'awb_assigned', status: 'skipped' })
    savedAwbCode = (orderRaw?.['awb_code'] as string) ?? null
    savedCourierName = (orderRaw?.['courier_name'] as string) ?? null
  }

  // Step 3: Schedule Pickup
  if (shouldRunStep('pickup_scheduled')) {
    try {
      const pickupResult = await shiprocketSchedulePickup({
        shipment_id: [shipmentId],
      })
      const pickupInfo = pickupResult.response?.[0]
      if (!pickupInfo?.status) {
        throw new Error('Shiprocket did not confirm pickup scheduling')
      }
      savedPickupDate = pickupInfo?.pickup_scheduled_date ?? null
      const tokenNumber = pickupInfo?.pickup_token_number ?? null
      await persistFulfillmentState(
        orderId,
        {
          pickup_scheduled_date: savedPickupDate,
          pickup_token_number: tokenNumber ? String(tokenNumber) : null,
          fulfillment_status: 'partial',
          fulfillment_step: 'pickup_scheduled',
        },
        'Pickup was scheduled but could not be persisted'
      )
      steps.push({
        step: 'pickup_scheduled',
        status: 'completed',
        details: { pickup_scheduled_date: savedPickupDate, pickup_token_number: tokenNumber },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 3 failed: schedule pickup')
      steps.push({ step: 'pickup_scheduled', status: 'failed', details: { error: msg } })
      return fail('pickup_scheduled', msg)
    }
  } else {
    steps.push({ step: 'pickup_scheduled', status: 'skipped' })
    savedPickupDate = (orderRaw?.['pickup_scheduled_date'] as string) ?? null
  }

  // Step 4: Generate Label
  if (shouldRunStep('label_generated')) {
    try {
      const labelResp = await shiprocketGenerateLabel(shipmentId)
      savedLabelGenerated = true
      await persistFulfillmentState(
        orderId,
        { label_generated: true, fulfillment_step: 'label_generated' },
        'Label generation could not be persisted'
      )
      steps.push({
        step: 'label_generated',
        status: 'completed',
        details: { label_url: labelResp.label_url },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 4 failed: generate label')
      steps.push({ step: 'label_generated', status: 'failed', details: { error: msg } })
      return fail('label_generated', msg)
    }
  } else {
    steps.push({ step: 'label_generated', status: 'skipped' })
    savedLabelGenerated = Boolean(orderRaw?.['label_generated'])
  }

  // Step 5: Generate Manifest
  if (shouldRunStep('manifest_generated')) {
    try {
      const manifestResp = await shiprocketGenerateManifest(shipmentId)
      savedManifestGenerated = true
      await persistFulfillmentState(
        orderId,
        { manifest_generated: true, fulfillment_step: 'manifest_generated' },
        'Manifest generation could not be persisted'
      )
      steps.push({
        step: 'manifest_generated',
        status: 'completed',
        details: { manifest_url: manifestResp.manifest_url },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 5 failed: generate manifest')
      steps.push({ step: 'manifest_generated', status: 'failed', details: { error: msg } })
      return fail('manifest_generated', msg)
    }
  } else {
    steps.push({ step: 'manifest_generated', status: 'skipped' })
    savedManifestGenerated = Boolean(orderRaw?.['manifest_generated'])
  }

  // Step 6: Mark as Ready for Pickup
  await persistFulfillmentState(
    orderId,
    {
      fulfillment_step: 'ready_for_pickup',
      fulfillment_status: 'partial',
      shiprocket_status: 'created',
      shiprocket_error: null,
    },
    'Ready-for-pickup state could not be persisted'
  )

  steps.push({ step: 'ready_for_pickup', status: 'completed' })

  invalidateOn('ORDER_UPDATED', { id: orderId, userId: '' })

  const order = await adminGetOrder(orderId)

  return {
    success: true,
    order,
    steps,
    shiprocket_order_id: savedShiprocketOrderId,
    shipment_id: savedShipmentId,
    awb_code: savedAwbCode,
    courier_name: savedCourierName,
    label_generated: savedLabelGenerated,
    manifest_generated: savedManifestGenerated,
    pickup_scheduled_date: savedPickupDate,
  }
}
