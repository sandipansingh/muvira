import type { PaymentMethod, RazorpayMethods } from '../../types/razorpay'

export function paymentErrorMetadata(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') return {}
  const input = error as Record<string, unknown>
  const output: Record<string, string> = {}
  for (const key of ['code', 'source', 'step', 'reason']) {
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
        : Object.keys(response).filter((key) => !!(response as Record<string, unknown>)[key])
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
