import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import { AccountNavigation } from '../components/auth/AccountNavigation'
import { StoreImage } from '../components/common/StoreImage'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderApiService } from '../lib/services/order.service'
import type { OrderListItem } from '../lib/types/order'
import { formatDate, formatPrice } from '../lib/utils/format'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { Pagination } from '../components/common/Pagination'

export const OrdersHistoryPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [page, setPage] = useState(1)
  const [refreshToken, setRefreshToken] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  useEffect(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false
      resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [page])

  const handlePageChange = (newPage: number) => {
    shouldScrollRef.current = true
    setPage(newPage)
  }

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
    <main className="account-page editorial-page py-10 sm:py-14">
      <div className="editorial-container max-w-6xl" ref={resultsContainerRef}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Account', href: '/profile' },
            { label: 'Order History' },
          ]}
        />
        <CustomerPageHeading
          eyebrow="Your Muvira / Purchases"
          title="Order History"
          description="Follow each piece from your shopping bag to your door."
        />
        <AccountNavigation />
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
            <p className="text-sm font-normal text-warning">{error}</p>
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
                className="order-history-card flex flex-col gap-5 py-6 transition-colors hover:bg-[var(--color-surface)] sm:flex-row sm:items-center sm:justify-between sm:px-3"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                  {order.firstItemImage ? (
                    <StoreImage
                      src={order.firstItemImage}
                      alt={order.firstItemName ?? 'Ordered product'}
                      width={256}
                      height={256}
                      className="h-32 w-32 shrink-0 rounded-image object-contain"
                    />
                  ) : (
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg bg-surface">
                      <Package className="h-6 w-6 text-disabled" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-sans text-base font-bold text-ink">
                        #{order.orderNumber}
                      </span>
                      <span className="status-badge">{order.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="font-product mt-1 text-base font-normal text-ink">
                      {order.firstItemName ?? `${order.itemCount} item(s)`}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="leading-none">Placed on {formatDate(order.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <span className="font-product block whitespace-nowrap text-base font-normal text-ink">
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
          <div className="mt-10">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </main>
  )
}

export default OrdersHistoryPage
