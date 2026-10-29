import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import { AccountShell } from '../components/auth/AccountShell'
import { StoreImage } from '../components/common/StoreImage'
import React, { useEffect, useRef, useState } from 'react'
import { Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderApiService } from '../lib/services/order.service'
import type { OrderListItem } from '../lib/types/order'
import { formatDate, formatPrice } from '../lib/utils/format'
import { Pagination } from '../components/common/Pagination'

function OrdersWorkspace({ userId }: { userId: string }) {
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
  }, [page, refreshToken, userId])

  return (
    <AccountShell>
      <div ref={resultsContainerRef} className="account-results">
        <CustomerPageHeading
          title="My orders"
          description="Your purchases, delivery updates and order details."
        />
        {loading ? (
          <p role="status" className="journey-card">
            Loading your orders…
          </p>
        ) : error ? (
          <div className="journey-card">
            <p role="alert" className="text-danger">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRefreshToken((current) => current + 1)}
              className="button-primary mt-5"
            >
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="journey-card py-10 text-center">
            <Package className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4">You have not placed any orders yet.</p>
            <Link to="/shop" className="button-primary mt-5">
              Explore Shop
            </Link>
          </div>
        ) : (
          <div className="journey-stack">
            {orders.map((order) => (
              <article key={order.id} className="order-history-card journey-card">
                <div className="order-history-heading">
                  <div>
                    <h2 className="font-sans text-base font-semibold">#{order.orderNumber}</h2>
                    <p className="mt-1 text-xs text-muted">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className="neutral-badge">{order.status.replaceAll('_', ' ')}</span>
                </div>
                <div className="order-history-product">
                  <StoreImage
                    framing="square"
                    fallbackPresentation="icon"
                    src={order.firstItemImage}
                    alt={order.firstItemName || 'Ordered product'}
                    width={192}
                    height={192}
                    className="order-item-image"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-product text-sm">
                      {order.firstItemName || 'Your ordered items'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · Payment{' '}
                      {order.paymentStatus}
                    </p>
                  </div>
                  <p className="font-product text-primary">{formatPrice(order.totalAmount)}</p>
                </div>
                <div className="order-history-actions">
                  <Link to={`/orders/${order.id}`} className="button-secondary">
                    View order
                  </Link>
                  <Link to={`/orders/${order.id}/tracking`} className="account-text-link">
                    Track order
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </AccountShell>
  )
}

export const OrdersHistoryPage: React.FC = () => {
  const { user, loading } = useAuth()
  if (loading || !user) return <main className="editorial-page" />
  return <OrdersWorkspace key={user.id} userId={user.id} />
}
export default OrdersHistoryPage
