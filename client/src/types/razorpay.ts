export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet'

export interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface RazorpayFailureResponse {
  error?: {
    code?: string
    description?: string
    source?: string
    step?: string
    reason?: string
    metadata?: { order_id?: string; payment_id?: string }
  }
}

export interface RazorpayMethods {
  card?: boolean
  upi?: boolean
  netbanking?: Record<string, string>
  wallet?: Record<string, boolean>
  card_networks?: Record<string, number>
}

export interface RazorpayQrResponse {
  qr_url?: string
  expires_on: number
  status: 'created' | 'expired'
}

export interface RazorpayPaymentData {
  amount: number
  currency: 'INR'
  order_id: string
  email: string
  contact: string
  method: PaymentMethod
  bank?: string
  wallet?: string
  upi?: { qr: true; timeout: number }
  'card[name]'?: string
  'card[number]'?: string
  'card[expiry_month]'?: string
  'card[expiry_year]'?: string
  'card[cvv]'?: string
}

export interface RazorpayInstance {
  methods?: RazorpayMethods
  once(event: 'ready', callback: (response?: { methods?: RazorpayMethods }) => void): void
  on(event: 'payment.success', callback: (response: RazorpaySuccessResponse) => void): void
  on(event: 'payment.error', callback: (response: RazorpayFailureResponse) => void): void
  on(event: 'payment.upi.qr', callback: (response: RazorpayQrResponse) => void): void
  createPayment(data: RazorpayPaymentData, options?: { app?: string; flow?: 'qr' }): void
  getSupportedUpiIntentApps?(): Promise<unknown>
}

declare global {
  interface Window {
    Razorpay?: new (options: { key: string; image?: string }) => RazorpayInstance
  }
}
