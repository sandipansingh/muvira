import type { Order, OrderItem } from './index'

export type CheckoutSessionState =
  | 'preparing'
  | 'payable'
  | 'pending'
  | 'paid'
  | 'released'
  | 'review'

export interface CheckoutPreparation {
  request_id: string
  user_id: string
  order_id: string
  dispatch_state: 'initialized' | 'dispatched' | 'ready' | 'review'
  provider_order_id: string | null
  created_at: string
}

export interface SessionOrder extends Order {
  order_items: OrderItem[]
  payments: Array<{
    razorpay_order_id: string
    amount_paisa: number
    currency: string
    status: string
  }>
}

export interface CheckoutPaymentSession {
  checkout_request_id: string | null
  order_id: string
  order_number: string
  razorpay_order_id: string | null
  key_id: string
  amount_paisa: number
  currency: 'INR'
  expires_at: string | null
  retention_deadline_at: string | null
  server_time: string
  state: CheckoutSessionState
  can_pay: boolean
  snapshot: {
    items: Array<
      Pick<
        OrderItem,
        | 'product_id'
        | 'product_name'
        | 'product_image_url'
        | 'quantity'
        | 'unit_price_paisa'
        | 'total_price_paisa'
      >
    >
    subtotal_paisa: number
    discount_amount_paisa: number
    shipping_amount_paisa: number
    tax_amount_paisa: number
    coupon_code: string | null
    shipping_method: string
    contact_email: string
    shipping: {
      full_name: string
      phone: string
      line1: string
      line2: string | null
      city: string
      state: string
      pincode: string
    }
  }
}
