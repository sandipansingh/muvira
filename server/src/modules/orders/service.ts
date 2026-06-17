import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Order } from '../../types'
import { invalidateOn } from '../../services/cacheInvalidation'
import { trackBulk } from '../../services/shiprocket'
import type {
  ListOrdersQuery,
  AdminListOrdersQuery,
  UpdateOrderStatusInput,
  UpdateFulfillmentInput,
  AddOrderNoteInput,
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

  return {
    orders: (data as Order[]) ?? [],
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
  if (error || !data) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

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
  return data as unknown as Order
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
    // Prevent state downgrades (e.g. if order is marked delivered manually, don't revert to shipped via auto-sync)
    if (order.status === 'delivered' && status === 'shipped') {
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

  if (status.includes('delivered')) {
    return 'delivered'
  }
  if (
    status.includes('shipped') ||
    status.includes('transit') ||
    status.includes('picked') ||
    status.includes('pickup') ||
    status.includes('out for delivery') ||
    status.includes('reached')
  ) {
    return 'shipped'
  }
  if (status.includes('cancelled') || status.includes('rto')) {
    return 'cancelled'
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
