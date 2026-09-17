import React from 'react'
import { AlertCircle, ArrowRight, ListChecks } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export const OrderFailurePage: React.FC = () => {
  const location = useLocation()
  const state =
    typeof location.state === 'object' && location.state !== null
      ? (location.state as Record<string, unknown>)
      : null
  const reason = state && typeof state['reason'] === 'string' ? state['reason'] : null
  const paymentStatus = state?.['paymentStatus'] === 'released' ? 'released' : 'unknown'

  return (
    <main className="editorial-page py-6 sm:py-12">
      <div className="editorial-container max-w-xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Checkout', href: '/checkout' },
            { label: 'Payment Error' },
          ]}
        />

        <div className="rounded-3xl border border-danger/30 bg-danger-soft p-6 text-center sm:p-10 shadow-xs space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-danger shadow-xs">
            <AlertCircle className="h-10 w-10 stroke-[2]" />
          </div>

          <div className="space-y-1">
            <span className="eyebrow text-xs font-bold uppercase tracking-wider text-danger">
              Payment Not Completed
            </span>
            <h1 className="heading page-title text-2xl font-bold text-[var(--color-ink)]">
              Order could not be confirmed
            </h1>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-danger/20 text-left space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Reason Details
            </span>
            <p className="text-sm font-medium text-[var(--color-ink)]">
              {reason ||
                'Payment status could not be confirmed. Check your orders before attempting another payment.'}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-3 pt-3 sm:flex-row">
            {paymentStatus === 'released' ? (
              <Link
                to="/checkout"
                className="button-primary gap-2 px-6 py-3.5 text-sm font-semibold"
              >
                <span>Return to Checkout</span>
              </Link>
            ) : (
              <Link to="/orders" className="button-primary gap-2 px-6 py-3.5 text-sm font-semibold">
                <ListChecks className="h-4 w-4 shrink-0" />
                <span>Check My Orders</span>
              </Link>
            )}
            <Link to="/cart" className="button-secondary py-3.5 px-6 text-sm font-semibold gap-2">
              <span>Return to Cart</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default OrderFailurePage
