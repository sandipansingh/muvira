export interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayFailureResponse {
  error?: {
    description?: string
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpaySuccessResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  modal?: {
    ondismiss?: () => void
  }
  retry?: {
    enabled: boolean
  }
}

interface RazorpayInstance {
  open(): void
  on(event: 'payment.failed', callback: (response: RazorpayFailureResponse) => void): void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export {}
