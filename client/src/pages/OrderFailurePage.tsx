import React from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export const OrderFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')
  const orderId = searchParams.get('orderId')
  return (
    <main className="editorial-page bg-ivory px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl border border-line bg-paper p-8 text-center sm:p-12">
        <AlertCircle className="mx-auto h-12 w-12 text-danger" />
        <p className="editorial-label mt-6 text-danger">Payment not completed</p>
        <h1 className="editorial-heading mt-3 text-4xl">Order could not be confirmed</h1>
        <p className="mt-5 text-sm leading-7 text-muted-ink">
          {reason || 'The payment could not be completed. You can safely retry from checkout.'}
        </p>
        {orderId && (
          <p className="mt-3 text-xs text-muted-ink">Pending order reference: {orderId}</p>
        )}
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link to="/checkout" className="editorial-button">
            <RefreshCw className="h-4 w-4" /> Retry payment
          </Link>
          <Link to="/cart" className="editorial-button-secondary">
            Return to cart <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}
