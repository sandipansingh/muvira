import { useCallback, useEffect, useRef, useState } from 'react'
import { checkoutService } from '../services/checkout.service'
import type { CheckoutPaymentSession, CreateCheckoutOrderInput } from '../../types/checkout'

export function useCheckoutSession(userId?: string) {
  const [session, setSession] = useState<CheckoutPaymentSession | null>(null)
  const [previousSession, setPreviousSession] = useState<CheckoutPaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef<string | null>(null)
  const generation = useRef(0)
  const refreshingGeneration = useRef<number | null>(null)
  const preparing = useRef(false)
  const hasLoaded = useRef(false)
  const latestSession = useRef(session)
  latestSession.current = session

  const refresh = useCallback(async () => {
    if (!userId) return
    const version = generation.current
    if (refreshingGeneration.current === version || preparing.current) return
    refreshingGeneration.current = version
    const current = latestSession.current
    if (!hasLoaded.current) setLoading(true)
    setError(null)
    try {
      let active = current
        ? await checkoutService.reconcile(current.orderId, userId)
        : await checkoutService.active(userId)
      if (active && ['pending', 'preparing'].includes(active.state))
        active = await checkoutService.reconcile(active.orderId, userId)
      if (version !== generation.current) return
      if (current && latestSession.current?.orderId === current.orderId) {
        setSession(active)
      } else if (!latestSession.current) {
        setPreviousSession(active && !['paid', 'released'].includes(active.state) ? active : null)
      }
    } catch (reason) {
      if (version === generation.current)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to check your current payment. Retry before continuing.'
        )
    } finally {
      if (refreshingGeneration.current === version) refreshingGeneration.current = null
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
    setPreviousSession(null)
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
      const prepared = await checkoutService.prepare(
        { ...input, checkoutRequestId: requestId.current },
        userId
      )
      if (version === generation.current) {
        latestSession.current = prepared
        setSession(prepared)
        setPreviousSession(null)
      }
    } catch (reason) {
      if (version === generation.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Payment setup could not be confirmed. Check its status before retrying.'
        )
        try {
          const active = await checkoutService.active(userId)
          if (version === generation.current && active) {
            if (active.checkoutRequestId === requestId.current) {
              latestSession.current = active
              setSession(active)
            } else setPreviousSession(active)
          }
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
    generation.current += 1
    latestSession.current = null
    requestId.current = null
    setSession(null)
    setPreviousSession(null)
    setError(null)
  }
  const resumePrevious = () => {
    if (!previousSession) return
    generation.current += 1
    requestId.current = previousSession.checkoutRequestId
    latestSession.current = previousSession
    setSession(previousSession)
    setPreviousSession(null)
    setError(null)
  }
  const returnToBag = () => {
    if (!session) return
    generation.current += 1
    latestSession.current = null
    requestId.current = null
    setPreviousSession(session)
    setSession(null)
    setError(null)
  }
  return {
    session,
    previousSession,
    setSession,
    loading,
    error,
    refresh,
    prepare,
    clearReleased,
    resumePrevious,
    returnToBag,
  }
}
