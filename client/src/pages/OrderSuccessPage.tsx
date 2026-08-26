import React from 'react'
import { ArrowRight, CheckCircle2, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')

  if (!orderId) {
    return (
      <main className="editorial-page min-h-[60vh] px-4 py-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="heading page-title">Order confirmation unavailable</h1>
          <p className="text-sm text-[var(--color-muted)]">
            We couldn't find the order reference in this session.
          </p>
          <Link to="/orders" className="button-primary py-3 px-6 text-sm font-semibold">
            View All Orders
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

        <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-10 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-accent-soft)] text-accent shadow-xs">
            <CheckCircle2 className="h-10 w-10 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              Payment Verified & Confirmed
            </span>
            <h1 className="heading page-title text-2xl sm:text-3xl font-bold">
              Thank you for your order!
            </h1>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Order Reference:{' '}
              <strong className="font-bold text-[var(--color-primary)]">
                #{orderNumber ?? orderId}
              </strong>
            </p>
          </div>

          {/* High Contrast Overview Callout */}
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-left border border-[var(--color-line)] space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Order Summary Callout
            </h2>
            <p className="text-sm text-[var(--color-ink)] font-medium leading-relaxed">
              Your order has been logged successfully and sent to our fulfillment team. You will
              receive SMS & email notifications as your shipment progresses.
            </p>
          </div>

          {/* Shipment Progress Stepper */}
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 space-y-4 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Delivery Status Timeline
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="space-y-1.5">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold">
                  ✓
                </div>
                <span className="block font-semibold text-[var(--color-ink)]">Confirmed</span>
              </div>
              <div className="space-y-1.5 opacity-60">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] font-medium">
                  2
                </div>
                <span className="block text-[var(--color-muted)]">Processing</span>
              </div>
              <div className="space-y-1.5 opacity-60">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] font-medium">
                  3
                </div>
                <span className="block text-[var(--color-muted)]">Shipped</span>
              </div>
              <div className="space-y-1.5 opacity-60">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] font-medium">
                  4
                </div>
                <span className="block text-[var(--color-muted)]">Delivered</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
            <div className="rounded-2xl border border-[var(--color-line)] p-4 space-y-2 bg-[var(--color-paper)]">
              <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-bold">
                <Truck className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                Estimated Delivery
              </div>
              <p className="text-[var(--color-ink-soft)] font-medium">
                Standard Dispatch (3-5 Business Days)
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-line)] p-4 space-y-2 bg-[var(--color-paper)]">
              <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-bold">
                <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
                Payment Verification
              </div>
              <p className="text-[var(--color-ink-soft)] font-medium">
                Verified via Razorpay Custom Checkout
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              to={`/orders/${encodeURIComponent(orderId)}`}
              className="button-primary py-3.5 px-6 text-sm font-semibold gap-2"
            >
              <PackageCheck className="h-4 w-4 shrink-0" />
              <span>Track Order Details</span>
            </Link>

            <Link to="/shop" className="button-secondary py-3.5 px-6 text-sm font-semibold gap-2">
              <span>Continue Shopping</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default OrderSuccessPage
