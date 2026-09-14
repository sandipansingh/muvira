import React, { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, PackageCheck, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { orderApiService } from '../lib/services/order.service'
import type { OrderDetail } from '../lib/types/order'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    let active = true
    orderApiService
      .getOrderById(orderId)
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        if (response.data.paymentStatus !== 'paid') {
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

  if (!orderId || error || !order) {
    return (
      <main className="editorial-page min-h-[60vh] px-4 py-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="heading page-title">Order confirmation unavailable</h1>
          <p className="text-sm text-[var(--color-ink)]">
            {error ?? 'No order reference was provided.'}
          </p>
          <Link to="/orders" className="button-primary px-6 py-3 text-sm font-semibold">
            View all orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-6 sm:py-12">
      <div className="editorial-container max-w-3xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Orders', href: '/orders' },
            { label: 'Confirmation' },
          ]}
        />

        <div className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 text-center shadow-xs sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-accent-soft)] text-accent shadow-xs">
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

          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left">
            <p className="text-sm font-medium leading-relaxed text-neutral-900">
              Your paid order is recorded and ready for the fulfillment team to process.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-left">
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
