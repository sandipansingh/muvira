import { useEffect, useRef, useState } from 'react'
import { checkoutQuotes } from '../services/checkoutQuote.service'
import { checkoutQuoteKey, type QuoteContext } from '../utils/quoteCoordinator'
import type { CheckoutQuote } from '../../types/checkout'

export function useCheckoutQuote(context: QuoteContext, enabled: boolean) {
  const key = checkoutQuoteKey(context)
  const latest = useRef(context)
  latest.current = context
  const [result, setResult] = useState<{ key: string; value: CheckoutQuote } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const attemptedRetry = useRef(0)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let active = true
    setPending(true)
    setFailure(null)
    const timer = window.setTimeout(() => {
      const force = attemptedRetry.current !== retryCount
      attemptedRetry.current = retryCount
      checkoutQuotes
        .request(latest.current, force)
        .then((value) => {
          if (active) setResult({ key, value })
        })
        .catch((reason: unknown) => {
          if (active) {
            setResult(null)
            setFailure({
              key,
              message: reason instanceof Error ? reason.message : 'Unable to calculate your total.',
            })
          }
        })
        .finally(() => {
          if (active) setPending(false)
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [key, enabled, retryCount])
  const error = failure?.key === key ? failure.message : null
  const quote = enabled && result?.key === key ? result.value : null
  return {
    quote,
    error,
    loading: enabled && (pending || (!quote && !error)),
    retry: () => {
      setResult(null)
      setRetryCount((value) => value + 1)
    },
  }
}
