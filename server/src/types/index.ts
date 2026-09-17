import type { SupabaseClient } from '@supabase/supabase-js'

// Auth

export interface AuthUser {
  id: string
  email: string
  role: 'user' | 'admin'
}

// Express augmentation

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser

      token?: string

      supabase?: SupabaseClient

      requestId?: string

      rawBody?: Buffer
    }
  }
}

// Pagination

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Standard API shapes

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string[]>
  }
}

// Domain models (mirrors DB schema)

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: string | null
  is_active: boolean
  sort_order: number
  show_in_navbar: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  category_id: string
  price_paisa: number
  compare_at_price_paisa: number | null
  cost_price_paisa: number | null
  sku: string | null
  stock: number
  weight_grams: number | null
  is_active: boolean
  is_featured: boolean
  tags: string[] | null
  meta_title: string | null
  meta_description: string | null
  metadata: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

export interface PublicProductDto {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  category_id: string
  price_paisa: number
  compare_at_price_paisa: number | null
  sku: string | null
  stock: number
  weight_grams: number | null
  is_active: boolean
  is_featured: boolean
  tags: string[] | null
  meta_title: string | null
  meta_description: string | null
  metadata: Record<string, string>
  created_at: string
  updated_at: string
  rating: number | null
  review_count: number
  product_images: Array<Pick<ProductImage, 'id' | 'url' | 'alt_text' | 'sort_order' | 'is_primary'>>
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount_paisa: number
  max_discount_paisa: number | null
  max_uses: number | null
  times_used: number
  is_active: boolean
  valid_from: string
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'rto'
    | 'returned'
    | 'refunded'
    | 'lost'
    | 'damaged'
    | 'delivery_failed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled' | 'exception'
  // Shipping address snapshot
  shipping_full_name: string
  shipping_phone: string
  shipping_address_line1: string
  shipping_address_line2: string | null
  shipping_city: string
  shipping_state: string
  shipping_pincode: string
  shipping_country: string
  contact_email: string
  shipping_method: 'standard' | 'express'
  checkout_expires_at: string | null
  payment_method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi' | 'paylater' | null
  billing_same_as_shipping: boolean
  billing_full_name: string
  billing_address_line1: string
  billing_address_line2: string | null
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
  billing_gst_number: string | null
  // Amounts (paisa)
  subtotal_paisa: number
  discount_amount_paisa: number
  shipping_amount_paisa: number
  tax_amount_paisa: number
  total_amount_paisa: number
  // Coupon
  coupon_id: string | null
  coupon_code: string | null
  coupon_discount_paisa: number
  // Fulfillment
  carrier_name: string | null
  tracking_id: string | null
  awb_code: string | null
  // Shiprocket integration
  shiprocket_order_id: string | null
  shiprocket_status: string | null
  shiprocket_error: string | null
  shipment_id: string | null
  courier_name: string | null
  tracking_url: string | null
  pickup_location: string | null
  package_weight_grams: number | null
  package_length_cm: number | null
  package_breadth_cm: number | null
  package_height_cm: number | null
  pickup_scheduled_date: string | null
  pickup_token_number: string | null
  label_generated: boolean
  manifest_generated: boolean
  fulfillment_step:
    | 'idle'
    | 'order_created'
    | 'awb_assigned'
    | 'pickup_scheduled'
    | 'label_generated'
    | 'manifest_generated'
    | 'ready_for_pickup'
    | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  // Immutable snapshots at time of order
  product_name: string
  product_sku: string | null
  product_image_url: string | null
  quantity: number
  unit_price_paisa: number
  total_price_paisa: number
  created_at: string
}

export interface AdminOrderSummary {
  id: string
  order_number: string
  user_id: string
  status: Order['status']
  payment_status: Order['payment_status']
  fulfillment_status: Order['fulfillment_status']
  total_amount_paisa: number
  shipping_full_name: string
  shipping_phone: string
  shipping_city: string
  shipping_state: string
  shipping_pincode: string
  contact_email: string
  awb_code: string | null
  created_at: string
  updated_at: string
  profiles: { email: string; full_name: string | null; phone: string | null } | null
}

export type NotificationEventType =
  | 'order.payment_captured'
  | 'order.payment_failed'
  | 'order.shipped'
  | 'order.out_for_delivery'
  | 'order.delivered'
  | 'order.cancelled'
  | 'order.rto'
  | 'order.returned'
  | 'order.refunded'
  | 'order.delivery_failed'
  | 'order.lost'
  | 'order.damaged'

export interface NotificationOutboxEvent {
  id: string
  aggregate_id: string
  event_type: NotificationEventType
  payload: Record<string, unknown>
}

export interface NotificationDelivery {
  id: string
  outbox_event_id: string
  order_id: string
  user_id: string
  event_type: NotificationEventType
  attempts: number
  max_attempts: number
}

export interface NotificationOrderSnapshot {
  id: string
  user_id: string
  order_number: string
  contact_email: string
  shipping_full_name: string
  shipping_city: string
  total_amount_paisa: number
  awb_code: string | null
  courier_name: string | null
}

export interface NotificationQueueResult {
  outboxProcessed: number
  deliveriesProcessed: number
  sent: number
  failed: number
}

export interface Payment {
  id: string
  order_id: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  amount_paisa: number
  currency: string
  status: 'created' | 'captured' | 'failed' | 'refunded'
  failure_reason: string | null
  captured_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentLog {
  id: string
  payment_id: string | null
  order_id: string | null
  event_type:
    | 'created'
    | 'verify_attempt'
    | 'verify_success'
    | 'verify_failure'
    | 'webhook_received'
    | 'webhook_processed'
    | 'webhook_duplicate'
    | 'webhook_failed'
  payload: Record<string, unknown> | null
  razorpay_event_id: string | null
  created_at: string
}

// Shipment tracking events (populated via Shiprocket webhook)

export interface ShipmentEvent {
  id: string
  order_id: string
  shipment_id: string | null
  status: string
  location: string | null
  remarks: string | null
  event_time: string
  raw_payload: Record<string, unknown> | null
  created_at: string
}

// Product reviews (verified buyer ratings + comments)
export interface ProductReview {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

// Checkout

export interface CheckoutTotals {
  subtotal_paisa: number
  discount_amount_paisa: number
  shipping_amount_paisa: number
  tax_amount_paisa: number
  total_amount_paisa: number
}

// Webhook events — raw receipt + processing audit trail

export interface WebhookEvent {
  id: string
  source: 'shiprocket' | 'razorpay'
  event_id: string | null
  event_type: string | null
  payload_hash: string
  raw_payload: Record<string, unknown>
  processing_status: 'received' | 'verified' | 'processing' | 'processed' | 'failed' | 'duplicate'
  retry_count: number
  error_message: string | null
  processing_token: string | null
  processing_started_at: string | null
  processing_lease_expires_at: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

// AppError

export interface SanitizedPostgrestError {
  code: string | null
  message: string | null
  details: string | null
  hint: string | null
}

export interface AppErrorContext {
  operation: string
  postgrest?: SanitizedPostgrestError
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
    public readonly context?: AppErrorContext
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
