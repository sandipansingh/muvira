import { useEffect, useState } from 'react'
import { orderApiService } from '../services/order.service'
import type { OrderDetail, OrderTrackingData } from '../types/order'

export function useCustomerOrder(id: string, userId: string) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [tracking, setTracking] = useState<OrderTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trackingLoading, setTrackingLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [trackingAttempt, setTrackingAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setOrder(null)
    setLoading(true)
    setError(null)
    void orderApiService
      .getOrderById(id)
      .then((response) => {
        if (!response.success) throw new Error(response.error.message)
        if (active) setOrder(response.data)
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load this order.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, userId, attempt])
  useEffect(() => {
    let active = true
    setTracking(null)
    setTrackingLoading(true)
    setTrackingError(null)
    void orderApiService
      .getOrderTracking(id)
      .then((response) => {
        if (!response.success) throw new Error(response.error.message)
        if (active) setTracking(response.data)
      })
      .catch((reason: unknown) => {
        if (active)
          setTrackingError(
            reason instanceof Error
              ? reason.message
              : 'Shipment tracking is temporarily unavailable.'
          )
      })
      .finally(() => {
        if (active) setTrackingLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, userId, trackingAttempt])
  return {
    order,
    tracking,
    loading,
    trackingLoading,
    error,
    trackingError,
    retry: () => setAttempt((value) => value + 1),
    retryTracking: () => setTrackingAttempt((value) => value + 1),
  }
}
