import React from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export const OrderFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')
  const orderId = searchParams.get('orderId')
  return (
    <main className="editorial-page px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border border-danger bg-danger-soft p-8 text-center sm:p-12">
        <AlertCircle className="mx-auto h-12 w-12 text-danger" />
        <span className="eyebrow mt-6 block text-danger">Payment Not Completed</span>
        <h1 className="heading mt-2 text-4xl sm:text-6xl">Order could not be confirmed</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {reason || 'The payment could not be completed. You can safely retry from checkout.'}
        </p>
        {orderId && <p className="mt-3 text-xs text-muted">Pending order reference: #{orderId}</p>}
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link to="/checkout" className="button-primary py-3 text-sm">
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span className="leading-none">Retry Payment</span>
          </Link>
          <Link to="/cart" className="button-secondary py-3 text-sm">
            <span className="leading-none">Return to Cart</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </main>
  )
}

export default OrderFailurePage
