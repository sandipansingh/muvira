export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'exception'

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  totalAmount: number // in paisa
  itemCount: number
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
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  couponCode: string | null
  shippingAddress: OrderAddress
  awbCode: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
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
