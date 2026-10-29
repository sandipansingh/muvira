import { useEffect, useRef, useState } from 'react'
import { checkoutService } from '../services/checkout.service'
import { loadRazorpaySdk, normalizeUpiApps } from '../utils/razorpay'
import type {
  RazorpayFailureResponse,
  RazorpayInstance,
  RazorpayMethods,
  RazorpayQrResponse,
  RazorpaySuccessResponse,
} from '../../types/razorpay'

export function useRazorpayMethods(
  handlers: {
    success: (response: RazorpaySuccessResponse) => void
    error: (response: RazorpayFailureResponse) => void
    qr: (response: RazorpayQrResponse) => void
  },
  expectedUserId?: string
) {
  const latest = useRef(handlers)
  latest.current = handlers
  const instance = useRef<RazorpayInstance | null>(null)
  const [methods, setMethods] = useState<RazorpayMethods | null>(null)
  const [apps, setApps] = useState<Array<{ code: string; name: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    instance.current = null
    setMethods(null)
    setError(null)
    setApps([])
    Promise.all([checkoutService.paymentConfig(expectedUserId), loadRazorpaySdk()])
      .then(([config, Razorpay]) => {
        if (!active) return
        const sdk = new Razorpay({ key: config.keyId })
        instance.current = sdk
        sdk.on('payment.success', (response) => {
          if (active) latest.current.success(response)
        })
        sdk.on('payment.error', (response) => {
          if (active) latest.current.error(response)
        })
        sdk.on('payment.upi.qr', (response) => {
          if (active) latest.current.qr(response)
        })
        timer = setTimeout(() => {
          if (active)
            setError('Payment methods are taking longer to load. Retry to check availability.')
        }, 5000)
        sdk.once('ready', (response) => {
          if (!active) return
          clearTimeout(timer)
          const enabled = response?.methods ?? sdk.methods
          if (!enabled) {
            setError('Payment methods could not be confirmed. Please retry.')
            return
          }
          setMethods(enabled)
          setError(null)
        })
        if (isMobile && sdk.getSupportedUpiIntentApps) {
          void sdk
            .getSupportedUpiIntentApps()
            .then((response) => {
              if (active) setApps(normalizeUpiApps(response))
            })
            .catch(() => {
              if (active) setApps([])
            })
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Secure payment is unavailable. Please retry.'
          )
      })
    return () => {
      active = false
      clearTimeout(timer)
      instance.current = null
    }
  }, [attempt, isMobile, expectedUserId])

  return { instance, methods, apps, isMobile, error, retry: () => setAttempt((value) => value + 1) }
}
