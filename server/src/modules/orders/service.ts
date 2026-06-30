import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Order } from '../../types'
import { invalidateOn } from '../../services/cacheInvalidation'
import {
  trackBulk,
  trackSingle,
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

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch orders')

  // Auto-sync tracking for any orders with active AWB codes (fire-and-forget)
  const orders = data as Order[] ?? []
  const activeAwbs = orders
    .filter((o) => o.awb_code && o.status !== 'delivered' && o.status !== 'cancelled')
    .map((o) => o.awb_code)
    .filter(Boolean) as string[]
  if (activeAwbs.length > 0) {
    syncOrdersTrackingInBackground(activeAwbs).catch(() => {})
  }

  return {
    orders,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

async function syncOrdersTrackingInBackground(awbs: string[]): Promise<void> {
  try {
    const trackingMap = await trackBulk(awbs)
    for (const [awb, data] of Object.entries(trackingMap)) {
      const shipmentTrack = data.tracking_data?.shipment_track
      const currentStatus = shipmentTrack?.[0]?.current_status
      if (currentStatus) {
        const mapped = mapShiprocketStatusToOrderStatus(currentStatus)
        if (mapped) {
          await updateOrderStatusByAwb(awb, mapped)
        }
      }
    }
  } catch (err) {
    logger.warn({ err, awbCount: awbs.length }, 'Bulk tracking sync (customer) failed')
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
  if (error || !data) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  // Auto-sync tracking from Shiprocket in background
  syncOrderTrackingInBackground(data as Record<string, unknown>).catch(() => {})

  return data as Order
}

//
// Admin: see all orders, update status/fulfillment
//

export async function adminListOrders(query: AdminListOrdersQuery): Promise<{
  orders: Order[]
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
      shipping_full_name, shipping_phone, shipping_city, shipping_state, shipping_pincode,
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
  if (q) dbQuery = dbQuery.ilike('order_number', `%${q}%`)

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch orders')

  return {
    orders: (data as unknown as Order[]) ?? [],
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

  if (error || !data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  // Auto-sync tracking from Shiprocket in background (fire-and-forget, non-blocking)
  syncOrderTrackingInBackground(data as Record<string, unknown>).catch(() => {})

  return data as unknown as Order
}

async function syncOrderTrackingInBackground(order: Record<string, unknown>): Promise<void> {
  const awbCode = order['awb_code'] as string | undefined
  const status = order['status'] as string | undefined
  if (!awbCode || status === 'delivered' || status === 'cancelled') return

  try {
    const trackResult = await trackSingle(awbCode)
    const shipmentTrack = trackResult.tracking_data?.shipment_track
    const currentStatus = shipmentTrack?.[0]?.current_status

    if (currentStatus) {
      const mappedStatus = mapShiprocketStatusToOrderStatus(currentStatus)
      if (mappedStatus) {
        await updateOrderStatusByAwb(awbCode, mappedStatus)
      }
    }
  } catch (err) {
    logger.warn({ err, awbCode: awbCode }, 'Background tracking sync failed')
  }
}

export async function adminUpdateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<Order> {
  const { data, error } = await adminSupabase
    .from('orders')
    .update({ status: input.status })
    .eq('id', orderId)
    .select()
    .single()

  if (error || !data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  return adminGetOrder(orderId)
}

export async function adminUpdateFulfillment(
  orderId: string,
  input: UpdateFulfillmentInput
): Promise<Order> {
  // When an AWB is set, mark as fulfilled; when cleared, revert to unfulfilled
  const fulfillment_status =
    input.awb_code != null && input.awb_code.trim() !== '' ? 'fulfilled' : 'unfulfilled'

  const { data, error } = await adminSupabase
    .from('orders')
    .update({
      awb_code: input.awb_code ?? null,
      fulfillment_status,
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error || !data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  return adminGetOrder(orderId)
}

export async function adminAddOrderNote(orderId: string, input: AddOrderNoteInput): Promise<Order> {
  // Append to existing notes (newline-separated)
  const { data: existing } = await adminSupabase
    .from('orders')
    .select('notes')
    .eq('id', orderId)
    .single()

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

  if (error || !data) throw new AppError(500, 'DB_ERROR', 'Failed to add note')
  return adminGetOrder(orderId)
}

export async function updateOrderStatusByAwb(
  awbCode: string,
  status: string
): Promise<Order | null> {
  const { data: order, error: fetchError } = await adminSupabase
    .from('orders')
    .select('id, user_id, status')
    .eq('awb_code', awbCode)
    .maybeSingle()

  if (fetchError || !order) return null

  if (order.status !== status) {
    // Prevent terminal downgrades via auto-sync
    if (order.status === 'delivered' && status === 'shipped') {
      return order as unknown as Order
    }
    if (order.status === 'delivered' && status === 'processing') {
      return order as unknown as Order
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('orders')
      .update({ status })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError || !updated) return null

    invalidateOn('ORDER_UPDATED', {
      id: order.id,
      userId: order.user_id,
    })

    return updated as unknown as Order
  }

  return order as unknown as Order
}

export function mapShiprocketStatusToOrderStatus(shiprocketStatus?: string): string | null {
  if (!shiprocketStatus) return null
  const status = shiprocketStatus.toLowerCase()

  // Terminal states
  if (status.includes('delivered')) return 'delivered'
  if (status.includes('cancelled') || status.includes('rto')) return 'cancelled'

  // In transit — shipment is actually moving
  if (
    status.includes('shipped') ||
    status.includes('in transit') ||
    status.includes('out for delivery') ||
    status.includes('reached') ||
    status.includes('picked up')
  ) {
    return 'shipped'
  }

  // Pre-transit — labels, manifests, pickup scheduling
  if (
    status.includes('awb') ||
    status.includes('pickup') ||
    status.includes('manifest') ||
    status.includes('label') ||
    status.includes('scheduled') ||
    status.includes('generated') ||
    status.includes('new') ||
    status.includes('ready')
  ) {
    return 'processing'
  }

  return null
}

export async function adminSyncTrackingOrders(): Promise<{
  totalChecked: number
  totalUpdated: number
}> {
  // 1. Fetch all orders with AWB code that are not delivered or cancelled
  const { data: orders, error } = await adminSupabase
    .from('orders')
    .select('id, awb_code, status')
    .not('awb_code', 'is', null)
    .not('status', 'in', '("delivered","cancelled")')

  if (error || !orders || orders.length === 0) {
    return { totalChecked: 0, totalUpdated: 0 }
  }

  const awbs = orders
    .map((o) => o.awb_code)
    .filter((awb): awb is string => typeof awb === 'string' && awb.trim() !== '')

  if (awbs.length === 0) {
    return { totalChecked: 0, totalUpdated: 0 }
  }

  // 2. Fetch tracking info from Shiprocket
  const trackingData = await trackBulk(awbs)

  let totalUpdated = 0

  // 3. For each order, check and update its status
  for (const order of orders) {
    const awb = order.awb_code
    if (!awb) continue

    const item = trackingData[awb]
    const trackingInfo = item?.tracking_data?.shipment_track?.[0]
    if (trackingInfo) {
      const srStatus = trackingInfo.current_status
      const targetStatus = mapShiprocketStatusToOrderStatus(srStatus)
      if (targetStatus && targetStatus !== order.status) {
        // Only update if it actually changes status
        const updated = await updateOrderStatusByAwb(awb, targetStatus)
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
// Shiprocket Integration - Create order in Shiprocket after payment capture
//

export async function createShiprocketOrder(
  orderId: string,
  pickupLocationOverride?: string
): Promise<{
  shiprocket_order_id: number
  shipment_id: number
} | null> {
  const { data: order, error } = await adminSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    logger.error({ orderId }, 'createShiprocketOrder: order not found')
    return null
  }

  if (order.shiprocket_order_id) {
    logger.info({ orderId, shiprocketOrderId: order.shiprocket_order_id }, 'Shiprocket order already exists - skipping')
    return { shiprocket_order_id: order.shiprocket_order_id, shipment_id: order.shipment_id }
  }

  const orderItems = order.order_items as Array<{
    product_name: string
    product_sku: string | null
    quantity: number
    unit_price_paisa: number
  }>

  // Mark as pending before starting
  await adminSupabase
    .from('orders')
    .update({ shiprocket_status: 'pending', shiprocket_error: null })
    .eq('id', orderId)

  // Compute total weight from product weights
  let totalWeightGrams = 0
  const productIds = orderItems
    .map((i) => (i as unknown as { product_id: string }).product_id)
    .filter(Boolean)

  if (productIds.length > 0) {
    const { data: products } = await adminSupabase
      .from('products')
      .select('id, weight_grams')
      .in('id', productIds)

    if (products && products.length > 0) {
      const weightMap = new Map(products.map((p) => [p.id, p.weight_grams ?? 200]))
      totalWeightGrams = orderItems.reduce((sum, item) => {
        const itemProductId = (item as unknown as { product_id: string }).product_id
        return sum + (weightMap.get(itemProductId) ?? 200) * item.quantity
      }, 0)
    }
  }
  if (totalWeightGrams <= 0) totalWeightGrams = 500

  // Fetch default dimensions from site_settings
  const { data: settingsData } = await adminSupabase
    .from('site_settings')
    .select('value')
    .eq('key', 'shiprocket_settings')
    .single()

  const defaults = (settingsData?.value as {
    pickup_location?: string
    default_length_cm?: number
    default_breadth_cm?: number
    default_height_cm?: number
    default_weight_grams?: number
  }) ?? {}

  const lengthCm = order.package_length_cm ?? defaults.default_length_cm ?? 15
  const breadthCm = order.package_breadth_cm ?? defaults.default_breadth_cm ?? 10
  const heightCm = order.package_height_cm ?? defaults.default_height_cm ?? 5
  const pickupLocation = pickupLocationOverride ?? order.pickup_location ?? defaults.pickup_location ?? ''

  const shiprocketItems = orderItems.map((item) => ({
    name: item.product_name,
    sku: item.product_sku ?? 'SKU',
    units: item.quantity,
    selling_price: Math.round(item.unit_price_paisa / 100),
    discount: 0,
    tax: 0,
  }))

  const addressLine1 = order.shipping_address_line1 ?? ''
  const addressLine2 = order.shipping_address_line2 ?? ''
  const fullAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1

  const fullName = order.shipping_full_name ?? 'Customer'
  const nameParts = fullName.trim().split(/\s+/)
  const billingFirstName = nameParts[0] ?? 'Customer'
  const billingLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  // Shiprocket order_id should avoid alphabetic characters per API docs.
  // Strip non-numeric chars from order_number to get a clean numeric ID.
  const numericOrderId = order.order_number.replace(/\D/g, '')

  try {
    const result = await shiprocketCreateOrder({
      order_id: numericOrderId,
      order_date: new Date(order.created_at ?? Date.now()).toISOString().split('T')[0] ?? '',
      pickup_location: pickupLocation,
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: fullAddress,
      billing_city: order.shipping_city,
      billing_pincode: order.shipping_pincode,
      billing_state: order.shipping_state,
      billing_country: order.shipping_country ?? 'India',
      billing_email: '',
      billing_phone: order.shipping_phone,
      shipping_is_billing: true,
      order_items: shiprocketItems,
      payment_method: order.payment_status === 'paid' ? 'Prepaid' : 'COD',
      sub_total: Math.round(order.subtotal_paisa / 100),
      shipping_charges: Math.round(order.shipping_amount_paisa / 100),
      total_discount: Math.round(order.discount_amount_paisa / 100),
      length: lengthCm,
      breadth: breadthCm,
      height: heightCm,
      weight: Math.round(totalWeightGrams / 1000) || 1,
    })

    // Shiprocket may nest response under 'data' key
    const rawResult = result as unknown as Record<string, unknown>
    const responseData = rawResult['data'] as Record<string, unknown> | undefined
    const resolved = responseData ?? rawResult

    const shiprocketOrderId = (resolved['shiprocket_order_id'] as number) ?? (resolved['order_id'] as number)
    const shipmentId = resolved['shipment_id'] as number | undefined

    if (!shiprocketOrderId) {
      throw new Error(`Unexpected Shiprocket response: ${JSON.stringify(result)}`)
    }

    await adminSupabase
      .from('orders')
      .update({
        shiprocket_order_id: String(shiprocketOrderId),
        shipment_id: String(shipmentId),
        shiprocket_status: 'created',
        shiprocket_error: null,
        pickup_location: pickupLocation,
        package_weight_grams: totalWeightGrams,
        package_length_cm: lengthCm,
        package_breadth_cm: breadthCm,
        package_height_cm: heightCm,
      })
      .eq('id', orderId)

    logger.info(
      { orderId, shiprocketOrderId, shipmentId },
      'Shiprocket order created successfully'
    )

    return { shiprocket_order_id: shiprocketOrderId, shipment_id: shipmentId ?? 0 }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error({ err, orderId }, 'Failed to create Shiprocket order')

    await adminSupabase
      .from('orders')
      .update({
        shiprocket_status: 'failed',
        shiprocket_error: errorMessage,
      })
      .eq('id', orderId)

    return null
  }
}

//
// Admin create shipment - validates pickup location, then creates Shiprocket order
//

export async function adminCreateShipment(
  orderId: string,
  pickupLocation: string
): Promise<Order> {
  // Fetch available pickup locations from Shiprocket to validate
  let availableLocations: Array<{ pickup_location: string }> = []
  try {
    availableLocations = await shiprocketGetPickupLocations()
  } catch {
    // If we can't fetch, proceed and let Shiprocket validate
  }

  if (availableLocations.length > 0) {
    const valid = availableLocations.some(
      (loc) => loc.pickup_location.toLowerCase() === pickupLocation.toLowerCase()
    )
    if (!valid) {
      const names = availableLocations.map((l) => `"${l.pickup_location}"`).join(', ')
      throw new AppError(400, 'INVALID_PICKUP_LOCATION',
        `Invalid pickup location "${pickupLocation}". Available: ${names}`
      )
    }
  }

  const result = await createShiprocketOrder(orderId, pickupLocation)
  if (!result) {
    throw new AppError(502, 'SHIPROCKET_FAILED', 'Failed to create Shiprocket order. Check error log.')
  }

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

  const { data: events } = await adminSupabase
    .from('shipment_events')
    .select('id, status, location, remarks, event_time')
    .eq('order_id', orderId)
    .order('event_time', { ascending: false })

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

async function getOrderShipmentId(orderId: string): Promise<{ shipmentId: number; awbCode: string | null }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('shipment_id, awb_code')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.shipment_id) throw new AppError(400, 'NO_SHIPMENT', 'No Shiprocket shipment_id found. Create a Shiprocket order first.')

  return { shipmentId: Number(order.shipment_id), awbCode: order.awb_code }
}

export async function adminAssignAwb(
  orderId: string,
  input: AssignAwbInput
): Promise<Order> {
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

  await adminSupabase
    .from('orders')
    .update({
      awb_code: awbData.awb_code,
      courier_name: awbData.courier_name ?? null,
      fulfillment_status: 'fulfilled',
    })
    .eq('id', orderId)

  invalidateOn('ORDER_UPDATED', { id: orderId, userId: '' })

  logger.info({ orderId, awb: awbData.awb_code, courier: awbData.courier_name }, 'AWB assigned')
  return adminGetOrder(orderId)
}

export async function adminSchedulePickup(orderId: string): Promise<{ status: string }> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  const result = await shiprocketSchedulePickup({
    shipment_id: [shipmentId],
  })

  const pickupStatus = result.response?.[0]?.status ?? 'scheduled'
  logger.info({ orderId, shipmentId, pickupStatus }, 'Pickup scheduled')
  return { status: pickupStatus }
}

export async function adminGenerateLabel(orderId: string): Promise<Buffer> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  let labelUrl = await tryGenerateOrFetchLabel(shipmentId)
  if (!labelUrl) {
    // Fallback: try fetching from shipment details
    try {
      const shipment = await shiprocketGetShipmentDetails(shipmentId)
      labelUrl = shipment.label_url ?? null
    } catch {
      // ignore
    }
  }

  if (!labelUrl) {
    throw new Error('Shiprocket did not return a label URL')
  }

  const pdfRes = await fetch(labelUrl)
  if (!pdfRes.ok) {
    throw new Error(`Failed to download label PDF: ${pdfRes.status} ${pdfRes.statusText}`)
  }
  const arrayBuf = await pdfRes.arrayBuffer()
  return Buffer.from(arrayBuf)
}

async function tryGenerateOrFetchLabel(shipmentId: number): Promise<string | null> {
  try {
    const labelResp = await shiprocketGenerateLabel(shipmentId)
    if (labelResp.label_url && labelResp.label_url.length > 0) {
      logger.info({ shipmentId, labelUrl: labelResp.label_url }, 'Label generated')
      return labelResp.label_url
    }
    // Empty URL — fall through to catch-like handling
    throw new Error('Label URL is empty')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('already') || msg.includes('Already') || msg.includes('empty')) {
      logger.info({ shipmentId }, 'Label already generated, fetching from shipment details')
      try {
        const shipment = await shiprocketGetShipmentDetails(shipmentId)
        return shipment.label_url ?? null
      } catch {
        return null
      }
    }
    throw err
  }
}

export async function adminGenerateManifest(orderId: string): Promise<Buffer> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  let manifestUrl = await tryGenerateOrFetchManifest(shipmentId)
  if (!manifestUrl) {
    // Fallback: try fetching from shipment details
    try {
      const shipment = await shiprocketGetShipmentDetails(shipmentId)
      manifestUrl = shipment.manifest_url ?? null
    } catch {
      // ignore
    }
  }

  if (!manifestUrl) {
    throw new Error('Shiprocket did not return a manifest URL')
  }

  const pdfRes = await fetch(manifestUrl)
  if (!pdfRes.ok) {
    throw new Error(`Failed to download manifest PDF: ${pdfRes.status} ${pdfRes.statusText}`)
  }
  const arrayBuf = await pdfRes.arrayBuffer()
  return Buffer.from(arrayBuf)
}

async function tryGenerateOrFetchManifest(shipmentId: number): Promise<string | null> {
  try {
    const manifestResp = await shiprocketGenerateManifest(shipmentId)
    if (manifestResp.manifest_url && manifestResp.manifest_url.length > 0) {
      logger.info({ shipmentId, manifestUrl: manifestResp.manifest_url }, 'Manifest generated')
      return manifestResp.manifest_url
    }
    // Empty URL — fall through to catch-like handling
    throw new Error('Manifest URL is empty')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('already') || msg.includes('Already') || msg.includes('empty')) {
      logger.info({ shipmentId }, 'Manifest already generated, fetching from shipment details')
      try {
        const shipment = await shiprocketGetShipmentDetails(shipmentId)
        return shipment.manifest_url ?? null
      } catch {
        return null
      }
    }
    throw err
  }
}

export async function adminGenerateInvoice(orderId: string): Promise<Buffer> {
  const { shipmentId } = await getOrderShipmentId(orderId)

  // Get the Shiprocket order_id from DB
  const { data: order } = await adminSupabase
    .from('orders')
    .select('shiprocket_order_id')
    .eq('id', orderId)
    .single()

  const srOrderId = order?.['shiprocket_order_id']
  if (!srOrderId) {
    throw new Error('No Shiprocket order ID found')
  }

  const invoiceResp = await shiprocketGenerateInvoice([Number(srOrderId)])
  logger.info({ orderId, shipmentId, invoiceUrl: invoiceResp.invoice_url }, 'Invoice generated')

  if (!invoiceResp.invoice_url) {
    throw new Error('Shiprocket did not return an invoice URL')
  }

  const pdfRes = await fetch(invoiceResp.invoice_url)
  if (!pdfRes.ok) {
    throw new Error(`Failed to download invoice PDF: ${pdfRes.status} ${pdfRes.statusText}`)
  }
  const arrayBuf = await pdfRes.arrayBuffer()
  return Buffer.from(arrayBuf)
}

export async function adminCancelShiprocketOrder(orderId: string): Promise<Record<string, unknown>> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('shiprocket_order_id')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.shiprocket_order_id) throw new AppError(400, 'NO_SHIPROCKET_ORDER', 'No Shiprocket order exists')

  const result = await shiprocketCancelOrder({
    ids: [Number(order.shiprocket_order_id)],
  })

  await adminSupabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  invalidateOn('ORDER_UPDATED', { id: orderId, userId: '' })
  logger.info({ orderId, shiprocketOrderId: order.shiprocket_order_id }, 'Shiprocket order cancelled')
  return result
}

export async function adminCancelShiprocketShipment(orderId: string): Promise<{ status: string }> {
  const { data: order } = await adminSupabase
    .from('orders')
    .select('awb_code')
    .eq('id', orderId)
    .single()

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  if (!order.awb_code) throw new AppError(400, 'NO_AWB', 'No AWB code found. Cannot cancel shipment.')

  const result = await shiprocketCancelShipment({
    awbs: [order.awb_code],
  })

  await adminSupabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  invalidateOn('ORDER_UPDATED', { id: orderId, userId: '' })
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

  let { data: orderRaw } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!orderRaw) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const currentStep = orderRaw['fulfillment_step'] as string | null

  // Step 1: Create Shiprocket Order
  if (!currentStep || currentStep === 'idle') {
    try {
      const result = await createShiprocketOrderV2(orderId, input)
      savedShiprocketOrderId = result.shiprocket_order_id
      savedShipmentId = result.shipment_id
      steps.push({ step: 'order_created', status: 'completed', details: { shiprocket_order_id: savedShiprocketOrderId, shipment_id: savedShipmentId } })
      await adminSupabase.from('orders').update({ fulfillment_step: 'order_created' }).eq('id', orderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error({ err, orderId }, 'Fulfill Step 1 failed: create Shiprocket order')
      steps.push({ step: 'order_created', status: 'failed', details: { error: msg } })
      return fail('order_created', msg)
    }
  } else {
    steps.push({ step: 'order_created', status: 'skipped' })
    // Restore saved state from DB for retry
    savedShiprocketOrderId = orderRaw['shiprocket_order_id'] ? Number(orderRaw['shiprocket_order_id']) : null
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
  if (!currentStep || currentStep === 'idle' || currentStep === 'order_created') {
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

      let awbData: { awb_code?: string; courier_name?: string } | undefined =
        (respData?.awb_code ? respData : undefined) as { awb_code?: string; courier_name?: string } | undefined

      // Fallback: response might be wrapped in a top-level 'data' key
      if (!awbData?.awb_code) {
        const topData = rawAssign['data'] as Record<string, unknown> | undefined
        if (topData) {
          const innerResp = topData['response'] as Record<string, unknown> | undefined
          const innerData = innerResp?.['data'] as Record<string, unknown> | undefined
          if (innerData?.awb_code) awbData = innerData as { awb_code?: string; courier_name?: string }
        }
      }

      // Final fallback: check if awb_code is directly on respData or resp array
      if (!awbData?.awb_code) {
        const respArr = respObj ? ([respObj] as Record<string, unknown>[]) : (rawAssign['response'] as Record<string, unknown>[] | undefined)
        if (respArr && respArr.length > 0) {
          awbData = respArr[0] as { awb_code?: string; courier_name?: string }
        }
      }

      logger.info({ orderId, shipmentId, assignResp: JSON.stringify(rawAssign) }, 'AWB assignment response')

      if (!awbData?.awb_code) {
        throw new Error('Shiprocket AWB assignment returned no AWB code. The order may need manual processing in the Shiprocket dashboard.')
      }
      savedAwbCode = awbData.awb_code
      savedCourierName = awbData.courier_name ?? null
      await adminSupabase
        .from('orders')
        .update({
          awb_code: savedAwbCode,
          courier_name: savedCourierName,
          fulfillment_status: 'fulfilled',
          fulfillment_step: 'awb_assigned',
        })
        .eq('id', orderId)
      steps.push({ step: 'awb_assigned', status: 'completed', details: { awb_code: savedAwbCode, courier_name: savedCourierName } })
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
  if (!currentStep || currentStep === 'idle' || currentStep === 'order_created' || currentStep === 'awb_assigned') {
    try {
      const pickupResult = await shiprocketSchedulePickup({
        shipment_id: [shipmentId],
      })
      const pickupInfo = pickupResult.response?.[0]
      savedPickupDate = pickupInfo?.pickup_scheduled_date ?? null
      const tokenNumber = pickupInfo?.pickup_token_number ?? null
      await adminSupabase
        .from('orders')
        .update({
          pickup_scheduled_date: savedPickupDate,
          pickup_token_number: tokenNumber ? String(tokenNumber) : null,
          fulfillment_step: 'pickup_scheduled',
        })
        .eq('id', orderId)
      steps.push({ step: 'pickup_scheduled', status: 'completed', details: { pickup_scheduled_date: savedPickupDate, pickup_token_number: tokenNumber } })
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
  if (!currentStep || currentStep === 'idle' || currentStep === 'order_created' || currentStep === 'awb_assigned' || currentStep === 'pickup_scheduled') {
    try {
      const labelResp = await shiprocketGenerateLabel(shipmentId)
      savedLabelGenerated = true
      await adminSupabase
        .from('orders')
        .update({ label_generated: true, fulfillment_step: 'label_generated' })
        .eq('id', orderId)
      steps.push({ step: 'label_generated', status: 'completed', details: { label_url: labelResp.label_url } })
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
  if (!currentStep || currentStep === 'idle' || currentStep === 'order_created' || currentStep === 'awb_assigned' || currentStep === 'pickup_scheduled' || currentStep === 'label_generated') {
    try {
      const manifestResp = await shiprocketGenerateManifest(shipmentId)
      savedManifestGenerated = true
      await adminSupabase
        .from('orders')
        .update({ manifest_generated: true, fulfillment_step: 'manifest_generated' })
        .eq('id', orderId)
      steps.push({ step: 'manifest_generated', status: 'completed', details: { manifest_url: manifestResp.manifest_url } })
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
  await adminSupabase
    .from('orders')
    .update({
      fulfillment_step: 'ready_for_pickup',
      shiprocket_status: 'created',
      shiprocket_error: null,
    })
    .eq('id', orderId)

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

//
// createShiprocketOrderV2 - creates a Shiprocket order with provided package dimensions
// (an enhanced version of createShiprocketOrder that accepts external input)
//

async function createShiprocketOrderV2(
  orderId: string,
  input: FulfillOrderInput
): Promise<{
  shiprocket_order_id: number
  shipment_id: number
}> {
  const { data: order, error } = await adminSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new Error('Order not found')
  }

  // If already created, skip
  if (order.shiprocket_order_id && order.shipment_id) {
    logger.info({ orderId, shiprocketOrderId: order.shiprocket_order_id }, 'Shiprocket order already exists - reusing')
    return { shiprocket_order_id: Number(order.shiprocket_order_id), shipment_id: Number(order.shipment_id) }
  }

  await adminSupabase
    .from('orders')
    .update({ shiprocket_status: 'pending', shiprocket_error: null })
    .eq('id', orderId)

  const orderItems = order.order_items as Array<{
    product_name: string
    product_sku: string | null
    quantity: number
    unit_price_paisa: number
  }>

  const weightKg = Math.max(input.weight_grams, 1) / 1000

  const shiprocketItems = orderItems.map((item) => ({
    name: item.product_name,
    sku: item.product_sku ?? 'SKU',
    units: item.quantity,
    selling_price: Math.round(item.unit_price_paisa / 100),
    discount: 0,
    tax: 0,
  }))

  const addressLine1 = order.shipping_address_line1 ?? ''
  const addressLine2 = order.shipping_address_line2 ?? ''
  const fullAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1

  const fullName = order.shipping_full_name ?? 'Customer'
  const nameParts = fullName.trim().split(/\s+/)
  const billingFirstName = nameParts[0] ?? 'Customer'
  const billingLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  const numericOrderId = order.order_number.replace(/\D/g, '')

  try {
    const result = await shiprocketCreateOrder({
      order_id: numericOrderId,
      order_date: new Date(order.created_at ?? Date.now()).toISOString().split('T')[0] ?? '',
      pickup_location: input.pickup_location,
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: fullAddress,
      billing_city: order.shipping_city,
      billing_pincode: order.shipping_pincode,
      billing_state: order.shipping_state,
      billing_country: order.shipping_country ?? 'India',
      billing_email: '',
      billing_phone: order.shipping_phone,
      shipping_is_billing: true,
      order_items: shiprocketItems,
      payment_method: input.payment_method ?? (order.payment_status === 'paid' ? 'Prepaid' : 'COD'),
      sub_total: Math.round(order.subtotal_paisa / 100),
      shipping_charges: Math.round(order.shipping_amount_paisa / 100),
      total_discount: Math.round(order.discount_amount_paisa / 100),
      length: input.length_cm,
      breadth: input.breadth_cm,
      height: input.height_cm,
      weight: Math.max(weightKg, 0.1),
    })

    const rawResult = result as unknown as Record<string, unknown>
    const responseData = rawResult['data'] as Record<string, unknown> | undefined
    const resolved = responseData ?? rawResult

    const shiprocketOrderId = (resolved['shiprocket_order_id'] as number) ?? (resolved['order_id'] as number)
    const srShipmentId = resolved['shipment_id'] as number | undefined

    if (!shiprocketOrderId) {
      throw new Error(`Unexpected Shiprocket response: ${JSON.stringify(result)}`)
    }

    await adminSupabase
      .from('orders')
      .update({
        shiprocket_order_id: String(shiprocketOrderId),
        shipment_id: String(srShipmentId),
        shiprocket_status: 'created',
        shiprocket_error: null,
        pickup_location: input.pickup_location,
        package_weight_grams: input.weight_grams,
        package_length_cm: input.length_cm,
        package_breadth_cm: input.breadth_cm,
        package_height_cm: input.height_cm,
      })
      .eq('id', orderId)

    logger.info({ orderId, shiprocketOrderId, shipmentId: srShipmentId }, 'Shiprocket order v2 created')

    return { shiprocket_order_id: shiprocketOrderId, shipment_id: srShipmentId ?? 0 }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error({ err, orderId }, 'Failed to create Shiprocket order v2')

    await adminSupabase
      .from('orders')
      .update({
        shiprocket_status: 'failed',
        shiprocket_error: errorMessage,
      })
      .eq('id', orderId)

    throw err
  }
}
