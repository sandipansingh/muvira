import { adminSupabase } from "../../lib/supabase/admin";
import { AppError } from "../../types";
import type { Order } from "../../types";
import type {
  ListOrdersQuery,
  AdminListOrdersQuery,
  UpdateOrderStatusInput,
  UpdateFulfillmentInput,
  AddOrderNoteInput,
} from "./schema";

//
// User-facing: only see own orders
//

export async function listUserOrders(
  userId: string,
  query: ListOrdersQuery,
): Promise<{
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page, limit, status, payment_status } = query;
  const offset = (page - 1) * limit;

  let dbQuery = adminSupabase
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    // Layer 2 ownership enforcement — always filter by userId from JWT
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) dbQuery = dbQuery.eq("status", status);
  if (payment_status) dbQuery = dbQuery.eq("payment_status", payment_status);

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;

  if (error) throw new AppError(500, "DB_ERROR", "Failed to fetch orders");

  return {
    orders: (data as Order[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getUserOrder(
  userId: string,
  orderId: string,
): Promise<Order> {
  const { data, error } = await adminSupabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    // Layer 2 ownership: both conditions must match
    .eq("user_id", userId)
    .single();

  // Return 404 whether the order doesn't exist OR belongs to another user
  // Never reveal that the order exists for a different user (prevent enumeration)
  if (error || !data) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  return data as Order;
}

//
// Admin: see all orders, update status/fulfillment
//

export async function adminListOrders(query: AdminListOrdersQuery): Promise<{
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const {
    page,
    limit,
    status,
    payment_status,
    fulfillment_status,
    q,
    from_date,
    to_date,
  } = query;
  const offset = (page - 1) * limit;

  let dbQuery = adminSupabase
    .from("orders")
    .select(
      `
      id, order_number, user_id, status, payment_status, fulfillment_status,
      subtotal_paisa, discount_amount_paisa, shipping_amount_paisa, tax_amount_paisa, total_amount_paisa,
      coupon_code, coupon_discount_paisa,
      shipping_full_name, shipping_phone, shipping_city, shipping_state, shipping_pincode,
      carrier_name, tracking_id, notes,
      created_at, updated_at,
      profiles ( email, full_name, phone )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status) dbQuery = dbQuery.eq("status", status);
  if (payment_status) dbQuery = dbQuery.eq("payment_status", payment_status);
  if (fulfillment_status)
    dbQuery = dbQuery.eq("fulfillment_status", fulfillment_status);
  if (from_date) dbQuery = dbQuery.gte("created_at", from_date);
  if (to_date) dbQuery = dbQuery.lte("created_at", to_date);
  if (q) dbQuery = dbQuery.ilike("order_number", `%${q}%`);

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;

  if (error) throw new AppError(500, "DB_ERROR", "Failed to fetch orders");

  return {
    orders: (data as unknown as Order[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function adminGetOrder(orderId: string): Promise<Order> {
  const { data, error } = await adminSupabase
    .from("orders")
    .select(
      `
      *,
      order_items(*),
      profiles ( email, full_name, phone ),
      payments ( id, razorpay_order_id, razorpay_payment_id, amount_paisa, status, captured_at )
    `,
    )
    .eq("id", orderId)
    .single();

  if (error || !data)
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return data as unknown as Order;
}

export async function adminUpdateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput,
): Promise<Order> {
  const { data, error } = await adminSupabase
    .from("orders")
    .update({ status: input.status })
    .eq("id", orderId)
    .select()
    .single();

  if (error || !data)
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return data as Order;
}

export async function adminUpdateFulfillment(
  orderId: string,
  input: UpdateFulfillmentInput,
): Promise<Order> {
  // Build update object with only provided fields
  const update: Partial<{
    fulfillment_status: string;
    carrier_name: string;
    tracking_id: string;
  }> = {};

  if (input.fulfillment_status !== undefined)
    update.fulfillment_status = input.fulfillment_status;
  if (input.carrier_name !== undefined)
    update.carrier_name = input.carrier_name;
  if (input.tracking_id !== undefined) update.tracking_id = input.tracking_id;

  const { data, error } = await adminSupabase
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select()
    .single();

  if (error || !data)
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return data as Order;
}

export async function adminAddOrderNote(
  orderId: string,
  input: AddOrderNoteInput,
): Promise<Order> {
  // Append to existing notes (newline-separated)
  const { data: existing } = await adminSupabase
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .single();

  if (!existing) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");

  const timestamp = new Date().toISOString();
  const noteEntry = `[${timestamp}] ${input.note}`;
  const updatedNotes = existing.notes
    ? `${existing.notes}\n${noteEntry}`
    : noteEntry;

  const { data, error } = await adminSupabase
    .from("orders")
    .update({ notes: updatedNotes })
    .eq("id", orderId)
    .select()
    .single();

  if (error || !data) throw new AppError(500, "DB_ERROR", "Failed to add note");
  return data as Order;
}
