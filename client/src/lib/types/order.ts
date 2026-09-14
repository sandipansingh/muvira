/**
 * Order status unions, Order models, Shiprocket integration types, and fulfillment tracking types.
 */
export type OrderStatus =
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

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'exception'
export type FulfillmentStep =
  | 'idle'
  | 'order_created'
  | 'awb_assigned'
  | 'pickup_scheduled'
  | 'label_generated'
  | 'manifest_generated'
  | 'ready_for_pickup'
export interface FulfillOrderInput {
  pickupLocation?: string
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  fulfillmentStep: FulfillmentStep | null
  totalAmount: number
  itemCount: number
  firstItemName?: string
  firstItemImage?: string
  createdAt: string
  awbCode: string | null
}

export interface OrderAddress {
  fullName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  country: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  unitPrice: number // in paisa
  quantity: number
  totalPrice: number // in paisa
}

export interface AdminNote {
  id: string
  note: string
  createdAt: string
  createdBy: string
}

export interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  fulfillmentStep: FulfillmentStep | null
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  couponCode: string | null
  paymentMethod: string | null
  shippingMethod: 'standard' | 'express'
  shippingAddress: OrderAddress
  awbCode: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
  // Shiprocket integration
  shiprocketOrderId: string | null
  shiprocketStatus: string | null
  shiprocketError: string | null
  shipmentId: string | null
  courierName: string | null
  trackingUrl: string | null
  // Fulfillment
  pickupScheduledDate: string | null
  pickupTokenNumber: string | null
  labelGenerated: boolean
  manifestGenerated: boolean
  // Package dimensions
  packageWeightGrams: number | null
  packageLengthCm: number | null
  packageBreadthCm: number | null
  packageHeightCm: number | null
  // Admin-only fields
  customer?: {
    id: string
    fullName: string
    phone: string
    email: string
  }
  adminNotes?: AdminNote[]
  deliveryInstructions?: string | null
}

export interface ShiprocketTrackActivity {
  date: string
  status: string
  activity: string
  location: string
  'sr-status'?: string
  'sr-status-label'?: string
}

export interface ShiprocketShipmentTrack {
  id: number
  awb_code: string
  current_status: string
  delivered_to: string
  destination: string
  consignee_name: string
  origin: string
  pickup_date: string | null
  delivered_date: string | null
  courier_name?: string
  edd?: string | null
}

export interface ShiprocketTrackData {
  track_status: number
  shipment_status: number
  shipment_track: ShiprocketShipmentTrack[]
  shipment_track_activities: ShiprocketTrackActivity[]
  track_url: string
  etd?: string
}

export interface OrderTrackingEvent {
  id: string
  status: string
  location: string | null
  remarks: string | null
  event_time: string
}

export interface OrderTrackingData {
  awb_code: string | null
  tracking_url: string | null
  courier_name: string | null
  shiprocket_status: string | null
  shipment_events: OrderTrackingEvent[]
}

export interface FulfillOrderRequest {
  pickup_location: string
  weight_grams: number
  length_cm: number
  breadth_cm: number
  height_cm: number
  package_count?: number
  courier_id?: number
  payment_method?: 'Prepaid' | 'COD'
  cod_amount?: number
}

export interface FulfillmentStepResult {
  step: string
  status: 'completed' | 'skipped' | 'failed'
  details?: Record<string, string | number>
}

export interface FulfillOrderResult {
  success: boolean
  order: OrderDetail
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

export interface CourierOption {
  courier_name: string
  courier_id: number
  rate: number
  estimated_delivery_days: number
  cod: boolean
  is_recommended?: boolean
}

export interface ServiceabilityResult {
  available_courier: CourierOption[]
  recommended_courier?: CourierOption
}
