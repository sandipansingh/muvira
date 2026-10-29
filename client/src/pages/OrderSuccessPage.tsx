import React, { useEffect, useState } from 'react'
import { formatDate } from '../lib/utils/format'
import { OrderItems, OrderTotals, OrderAddressCard } from '../components/orders/OrderCards'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { useAuth } from '../context/AuthContext'
import { orderApiService } from '../lib/services/order.service'
import type { OrderDetail } from '../lib/types/order'
import { isVerifiedPaidOrder, orderConfirmationError } from '../lib/utils/orderConfirmation'

function ConfirmationWorkspace({ orderId }: { orderId: string | null }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOrder(null)
    setError(null)
    setLoading(Boolean(orderId))
    if (!orderId) return
    let active = true
    orderApiService
      .getOrderById(orderId)
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        if (response.data.paymentStatus === 'pending') {
          setOrder(response.data)
          return
        }
        if (!isVerifiedPaidOrder(response.data)) {
          throw new Error('This order does not have a verified paid status.')
        }
        setOrder(response.data)
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Order confirmation is unavailable.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [orderId])

  if (loading) {
    return (
      <main className="editorial-page min-h-[60vh] px-4 py-12 text-center">
        <p className="text-sm text-[var(--color-ink)]">Verifying your order…</p>
      </main>
    )
  }

  if (order?.paymentStatus === 'pending') {
    return (
      <main className="order-result order-result--pending editorial-page py-12 sm:py-16">
        <section className="mx-auto max-w-xl px-4 text-center">
          <div className="result-panel result-panel--pending panel space-y-6 p-6 sm:p-10">
            <Clock3 className="mx-auto h-12 w-12 text-muted" />
            <span className="eyebrow block">Payment pending</span>
            <h1 className="page-title">Payment is being confirmed</h1>
            <p className="text-base leading-7 text-muted">
              We are waiting for confirmation for order #{order.orderNumber}. Check its status
              before attempting another payment.
            </p>
            <Link to={`/orders/${encodeURIComponent(order.id)}`} className="button-primary">
              View order status
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const confirmationError = orderConfirmationError(orderId, order, error)

  if (confirmationError || !order) {
    return (
      <main className="editorial-page min-h-[60vh] px-4 py-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="heading page-title">Order confirmation unavailable</h1>
          <p className="text-sm text-[var(--color-ink)]">{confirmationError}</p>
          <Link to="/orders" className="button-primary px-6 py-3 text-sm font-semibold">
            View all orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="order-result order-result--success editorial-page py-10 sm:py-14">
      <div className="editorial-container">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Orders', href: '/orders' },
            { label: 'Confirmation' },
          ]}
        />
        <div className="confirmation-layout mt-8">
          <div className="journey-stack">
            <header className="confirmation-welcome">
              <CheckCircle2 className="h-10 w-10 text-accent" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-ink">Payment verified</p>
              <h1 className="page-title mt-3">Thank you for your order</h1>
              <p className="mt-4 text-sm text-ink-soft">
                Order reference: <strong className="text-ink">#{order.orderNumber}</strong>
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                Your order is confirmed and ready for our fulfillment team.
              </p>
            </header>
            <section className="journey-card">
              <h2 className="journey-section-title mb-5">Order information</h2>
              <dl className="shipment-facts">
                <div>
                  <dt>Order date</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt>Order status</dt>
                  <dd className="capitalize">{order.status.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Payment status</dt>
                  <dd className="capitalize">{order.paymentStatus}</dd>
                </div>
                <div>
                  <dt>Payment method</dt>
                  <dd>
                    {order.paymentMethod === 'razorpay'
                      ? 'Razorpay'
                      : order.paymentMethod || 'Online payment'}
                  </dd>
                </div>
              </dl>
            </section>
            <OrderAddressCard address={order.shippingAddress} />
          </div>
          <div className="journey-stack">
            <OrderItems order={order} />
            <OrderTotals order={order} />
          </div>
        </div>
        <div className="confirmation-actions">
          <Link to={`/orders/${encodeURIComponent(order.id)}/tracking`} className="button-primary">
            Track order
          </Link>
          <Link to={`/orders/${encodeURIComponent(order.id)}`} className="button-secondary">
            View order details
          </Link>
          <Link to="/shop" className="account-text-link">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  )
}
export const OrderSuccessPage: React.FC = () => {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  if (loading || !user) return <main className="editorial-page" />
  return <ConfirmationWorkspace key={`${user.id}:${orderId || ''}`} orderId={orderId} />
}
export default OrderSuccessPage
