import { useCallback, useEffect, useRef, useState } from 'react'
import { checkoutService } from '../services/checkout.service'
import type { CheckoutPaymentSession, CreateCheckoutOrderInput } from '../../types/checkout'

export function useCheckoutSession(userId?: string) {
  const [session, setSession] = useState<CheckoutPaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef<string | null>(null)
  const generation = useRef(0)
  const preparing = useRef(false)
  const hasLoaded = useRef(false)
  const latestSession = useRef(session)
  latestSession.current = session

  const refresh = useCallback(async () => {
    if (!userId) return
    const version = generation.current
    if (!hasLoaded.current) setLoading(true)
    setError(null)
    try {
      let active = await checkoutService.active()
      if (!active && latestSession.current)
        active = await checkoutService.reconcile(latestSession.current.orderId)
      if (active && ['pending', 'preparing'].includes(active.state))
        active = await checkoutService.reconcile(active.orderId)
      if (version === generation.current) {
        setSession((current) => active ?? current)
        if (active?.checkoutRequestId) requestId.current = active.checkoutRequestId
      }
    } catch (reason) {
      if (version === generation.current)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to check your current payment. Retry before continuing.'
        )
    } finally {
      if (version === generation.current) {
        hasLoaded.current = true
        setLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    generation.current += 1
    requestId.current = null
    hasLoaded.current = false
    setSession(null)
    if (userId) void refresh()
    else setLoading(false)
    const onFocus = () => {
      if (document.visibilityState === 'visible' && !preparing.current) void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      generation.current += 1
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, refresh])

  const prepare = async (input: CreateCheckoutOrderInput) => {
    if (preparing.current) return
    preparing.current = true
    setError(null)
    const version = generation.current
    requestId.current ??= crypto.randomUUID()
    try {
      const prepared = await checkoutService.prepare({
        ...input,
        checkoutRequestId: requestId.current,
      })
      if (version === generation.current) setSession(prepared)
    } catch (reason) {
      if (version === generation.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Payment setup could not be confirmed. Check its status before retrying.'
        )
        try {
          const active = await checkoutService.active()
          if (version === generation.current && active) setSession(active)
        } catch {
          /* The visible setup error remains until an explicit recovery succeeds. */
        }
      }
      throw reason
    } finally {
      preparing.current = false
    }
  }

  const clearReleased = () => {
    requestId.current = null
    setSession(null)
    setError(null)
  }
  return { session, setSession, loading, error, refresh, prepare, clearReleased }
}
