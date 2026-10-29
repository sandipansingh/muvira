import type { PaymentMethod, RazorpayMethods, RazorpayPaymentError } from '../../types/razorpay'

export function normalizePaymentError(response: unknown): RazorpayPaymentError {
  if (!response || typeof response !== 'object') return {}
  const wrapped = response as Record<string, unknown>
  const input =
    wrapped.error && typeof wrapped.error === 'object'
      ? (wrapped.error as Record<string, unknown>)
      : wrapped
  const output: RazorpayPaymentError = {}
  for (const key of ['code', 'description', 'source', 'step', 'reason'] as const) {
    if (typeof input[key] === 'string') output[key] = input[key]
  }
  if (input.metadata && typeof input.metadata === 'object') {
    const metadata = input.metadata as Record<string, unknown>
    output.metadata = {}
    for (const key of ['order_id', 'payment_id'] as const) {
      if (typeof metadata[key] === 'string') output.metadata[key] = metadata[key]
    }
  }
  return output
}

export function paymentErrorCopy(error: unknown): string {
  const metadata = paymentErrorMetadata(error)
  if (metadata.reason === 'intent_no_apps_error')
    return 'The selected UPI app could not open. Check payment status, then choose another supported app or payment method.'
  if (
    ['payment_cancelled', 'payment_canceled', 'payment_cancelled_by_user'].includes(
      metadata.reason ?? ''
    )
  )
    return 'Payment was cancelled. Check its status before trying again.'
  return 'Payment was not completed. Check its status before trying again safely.'
}

export function paymentErrorMetadata(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') return {}
  const input = normalizePaymentError(error)
  const output: Record<string, string> = {}
  for (const key of ['code', 'source', 'step', 'reason'] as const) {
    const value = input[key]
    if (typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_:-]{0,79}$/.test(value))
      output[key] = value
  }
  if (input.metadata && typeof input.metadata === 'object') {
    const metadata = input.metadata as Record<string, unknown>
    for (const [key, target, prefix] of [
      ['order_id', 'orderId', 'order_'],
      ['payment_id', 'paymentId', 'pay_'],
    ]) {
      const value = metadata[key!]
      if (
        typeof value === 'string' &&
        value.startsWith(prefix!) &&
        /^(order|pay)_[A-Za-z0-9]{1,90}$/.test(value)
      )
        output[target!] = value
    }
  }
  return output
}

export function availablePaymentMethods(methods: RazorpayMethods): PaymentMethod[] {
  const result: PaymentMethod[] = []
  if (methods.upi === true) result.push('upi')
  if (methods.card === true) result.push('card')
  if (methods.netbanking && Object.keys(methods.netbanking).length) result.push('netbanking')
  if (methods.wallet && Object.values(methods.wallet).some((enabled) => enabled === true))
    result.push('wallet')
  return result
}

const UPI_APP_NAMES: Record<string, string> = {
  gpay: 'Google Pay',
  phonepe: 'PhonePe',
  paytm: 'Paytm',
  cred: 'CRED',
  bhim: 'BHIM',
  popclubapp: 'POP',
  mobikwik: 'MobiKwik',
  super_money: 'super.money',
  moneyview: 'Moneyview',
  icici: 'iMobile',
  navi: 'Navi',
  payzapp: 'PayZapp',
  any: 'Other UPI apps',
}

export function normalizeUpiApps(response: unknown): Array<{ code: string; name: string }> {
  const list = Array.isArray(response)
    ? response
    : response && typeof response === 'object'
      ? 'apps' in response && Array.isArray(response.apps)
        ? response.apps
        : Object.keys(response).filter((key) => (response as Record<string, unknown>)[key] === true)
      : []
  const codes = list.map((item: unknown) =>
    typeof item === 'string'
      ? item
      : item && typeof item === 'object' && 'app' in item
        ? String(item.app)
        : item && typeof item === 'object' && 'code' in item
          ? String(item.code)
          : ''
  )
  return [...new Set(codes)]
    .filter((code) => UPI_APP_NAMES[code])
    .map((code) => ({ code, name: UPI_APP_NAMES[code]! }))
}

let sdkLoading: Promise<NonNullable<Window['Razorpay']>> | null = null
export function loadRazorpaySdk(): Promise<NonNullable<Window['Razorpay']>> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (sdkLoading) return sdkLoading
  sdkLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/razorpay.js'
    script.async = true
    const timer = window.setTimeout(() => fail(), 12000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      sdkLoading = null
      reject(new Error('Secure payment could not load. Check your connection and retry.'))
    }
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.Razorpay) resolve(window.Razorpay)
      else fail()
    }
    document.head.appendChild(script)
  })
  return sdkLoading
}
