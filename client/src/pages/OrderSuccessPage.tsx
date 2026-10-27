import React, { useEffect, useState } from 'react'
import { StoreImage } from '../components/common/StoreImage'
import { formatPrice } from '../lib/utils/format'
import { ArrowRight, CheckCircle2, Clock3, PackageCheck, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { orderApiService } from '../lib/services/order.service'
import type { OrderDetail } from '../lib/types/order'
import { isVerifiedPaidOrder, orderConfirmationError } from '../lib/utils/orderConfirmation'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
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
    <main className="order-result order-result--success editorial-page py-10 sm:py-16">
      <div className="editorial-container max-w-3xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Orders', href: '/orders' },
            { label: 'Confirmation' },
          ]}
        />

        <div className="result-panel space-y-6 rounded-card border border-[var(--color-line)] bg-[var(--color-paper)] p-6 text-center shadow-none sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-card bg-[var(--color-accent-soft)] text-accent shadow-none">
            <CheckCircle2 className="h-10 w-10 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              Payment verified
            </span>
            <h1 className="heading page-title text-2xl font-bold sm:text-3xl">
              Thank you for your order
            </h1>
            <p className="text-sm text-[var(--color-ink)]">
              Order reference:{' '}
              <strong className="font-bold text-[var(--color-primary)]">
                #{order.orderNumber}
              </strong>
            </p>
          </div>

          <div className="result-order-items text-left">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-t border-line py-4">
                <StoreImage
                  src={item.productImage || undefined}
                  alt={item.productName}
                  width={256}
                  height={256}
                  className="h-32 w-32 shrink-0 rounded-image object-contain"
                />
                <div className="min-w-0">
                  <p className="font-product text-sm font-semibold text-ink">{item.productName}</p>
                  <p className="mt-2 text-sm text-muted">
                    Qty {item.quantity} · {formatPrice(item.totalPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-card border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left">
            <p className="text-sm font-medium leading-relaxed text-ink">
              Your paid order is recorded and ready for the fulfillment team to process.
            </p>
          </div>

          <div className="rounded-card border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-left">
            <div className="flex items-center gap-2 font-bold text-[var(--color-ink)]">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Razorpay verification complete
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Link
              to={`/orders/${encodeURIComponent(order.id)}`}
              className="button-primary gap-2 px-6 py-3.5 text-sm font-semibold"
            >
              <PackageCheck className="h-4 w-4 shrink-0" />
              <span>View order details</span>
            </Link>
            <Link to="/shop" className="button-secondary gap-2 px-6 py-3.5 text-sm font-semibold">
              <span>Continue shopping</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default OrderSuccessPage
