import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Package } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderApiService } from '../lib/services/order.service'
import type { OrderListItem } from '../lib/types/order'
import { formatDate, formatPrice } from '../lib/utils/format'

export const OrdersHistoryPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [page, setPage] = useState(1)
  const [refreshToken, setRefreshToken] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin?returnTo=/orders', { replace: true })
  }, [authLoading, navigate, user])

  useEffect(() => {
    if (!user) return
    let active = true
    const loadOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await orderApiService.getOrders(page)
        if (!response.success) throw new Error(response.error.message)
        if (active) {
          setOrders(response.data)
          setTotalPages(response.pagination.totalPages)
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load orders.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadOrders()
    return () => {
      active = false
    }
  }, [page, refreshToken, user])

  if (authLoading || !user) return <main className="editorial-page" />

  return (
    <main className="editorial-page py-8 sm:py-10">
      <div className="editorial-container max-w-4xl">
        <div className="mb-6 border-b border-border-light pb-4">
          <span className="eyebrow mb-2 block">Account / Purchases</span>
          <h1 className="heading page-title">Order History</h1>
          <p className="body-copy mt-2 text-sm">Track your past purchases and deliveries.</p>
        </div>
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="border-y border-warning bg-warning-soft py-6 text-center">
            <p className="text-sm font-semibold text-warning">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshToken((current) => current + 1)}
              className="button-primary mt-5"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && orders.length === 0 && (
          <div className="border-y border-[var(--color-line)] py-8 text-center">
            <Package className="mx-auto h-10 w-10 text-disabled" />
            <p className="mt-3 text-sm text-muted">You have not placed any orders yet.</p>
            <Link to="/shop" className="button-primary mt-5">
              Explore Shop
            </Link>
          </div>
        )}
        {!loading && !error && orders.length > 0 && (
          <div className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex flex-col gap-4 py-4 transition-colors hover:bg-[var(--color-surface)] sm:flex-row sm:items-center sm:justify-between sm:px-3"
              >
                <div className="flex items-center gap-4">
                  {order.firstItemImage ? (
                    <img
                      src={order.firstItemImage}
                      alt={order.firstItemName ?? 'Ordered product'}
                      className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface">
                      <Package className="h-6 w-6 text-disabled" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-display text-base font-bold text-ink">
                        #{order.orderNumber}
                      </span>
                      <span className="status-badge">{order.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-ink">
                      {order.firstItemName ?? `${order.itemCount} item(s)`}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="leading-none">Placed on {formatDate(order.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <span className="block text-base font-bold text-ink">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <span className="text-[11px] text-muted">{order.itemCount} item(s)</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="border border-line rounded-[var(--radius-control)] p-2 disabled:opacity-40 hover:bg-surface cursor-pointer"
              aria-label="Previous orders page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="border border-line rounded-[var(--radius-control)] p-2 disabled:opacity-40 hover:bg-surface cursor-pointer"
              aria-label="Next orders page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default OrdersHistoryPage
