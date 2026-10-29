import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkoutService } from '../services/checkout.service'
import type { CheckoutPaymentSession, CreateCheckoutOrderInput } from '../../types/checkout'

export function useCheckoutSession(userId: string, ready = true) {
  const navigate = useNavigate()
  const location = useLocation()
  const routeAttempt = new URLSearchParams(location.search).get('attempt')
  const lastRouteAttempt = useRef(routeAttempt)
  const recoverRequest = useRef(!!routeAttempt)
  const [requestId, setRequestId] = useState(() => routeAttempt || crypto.randomUUID())
  const [session, setSession] = useState<CheckoutPaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(session)
  latest.current = session
  const input = useRef<CreateCheckoutOrderInput | null>(null)
  const generation = useRef(0)
  const invalidate = useCallback(() => {
    generation.current++
  }, [])
  const preparing = useRef(false)
  const currentRequest = useRef(requestId)
  currentRequest.current = requestId
  useEffect(() => {
    if (lastRouteAttempt.current === routeAttempt) return
    lastRouteAttempt.current = routeAttempt
    if (routeAttempt === requestId) return
    generation.current++
    input.current = null
    latest.current = null
    recoverRequest.current = !!routeAttempt
    setSession(null)
    setError(null)
    setLoading(true)
    const next = routeAttempt || crypto.randomUUID()
    currentRequest.current = next
    setRequestId(next)
  }, [routeAttempt, requestId])
  const lookup = useCallback(async () => {
    const recovered =
      recoverRequest.current || input.current
        ? await checkoutService.request(requestId, userId)
        : null
    if (!recovered) await checkoutService.initializeAttempt(requestId, userId)
    return recovered
  }, [requestId, userId])

  useEffect(() => {
    if (!ready) return
    const version = ++generation.current
    setLoading(true)
    setError(null)
    lookup()
      .then((recovered) => {
        if (version === generation.current) setSession(recovered)
      })
      .catch((reason: unknown) => {
        if (version === generation.current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to recover this purchase. Retry or start a new order.'
          )
      })
      .finally(() => {
        if (version === generation.current) setLoading(false)
      })
    return invalidate
  }, [lookup, ready, invalidate])

  const prepare = async (details: CreateCheckoutOrderInput) => {
    if (preparing.current) return
    preparing.current = true
    const version = generation.current
    const id = requestId
    input.current ??= details
    recoverRequest.current = true
    const search = new URLSearchParams(location.search)
    search.set('attempt', id)
    navigate(`${location.pathname}?${search}`, { replace: true })
    setError(null)
    try {
      const recovered = await checkoutService.prepare(
        { ...input.current, checkoutRequestId: id },
        userId
      )
      if (version === generation.current && currentRequest.current === id) setSession(recovered)
    } catch (reason) {
      if (version === generation.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Payment setup could not be confirmed. Retry or start a new order.'
        )
        try {
          const recovered = await checkoutService.request(id, userId)
          if (version === generation.current && recovered) {
            setSession(recovered)
            setError(null)
          }
        } catch {
          /* Keep the visible recovery error until an explicit retry succeeds. */
        }
      }
      throw reason
    } finally {
      preparing.current = false
    }
  }
  const refreshing = useRef(false)
  const refresh = async () => {
    if (refreshing.current || preparing.current) return
    refreshing.current = true
    const version = generation.current
    setLoading(true)
    try {
      const recovered = latest.current
        ? await checkoutService.reconcile(latest.current.orderId, userId)
        : await lookup()
      if (version !== generation.current) return
      if (recovered) setSession(recovered)
      else if (input.current) await prepare(input.current)
      setError(null)
    } catch (reason) {
      if (version === generation.current)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to recover this purchase. Please retry.'
        )
    } finally {
      refreshing.current = false
      if (version === generation.current) setLoading(false)
    }
  }
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible' && latest.current) void refreshRef.current()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  const startNew = () => {
    generation.current++
    input.current = null
    recoverRequest.current = false
    latest.current = null
    setSession(null)
    setError(null)
    setLoading(true)
    const id = crypto.randomUUID()
    currentRequest.current = id
    setRequestId(id)
    lastRouteAttempt.current = null
    const search = new URLSearchParams(location.search)
    search.delete('attempt')
    navigate(location.pathname + (search.size ? `?${search}` : ''), { replace: true })
  }
  return { session, setSession, loading, error, refresh, prepare, startNew }
}
