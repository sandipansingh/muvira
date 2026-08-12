import React from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export const OrderFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')
  const orderId = searchParams.get('orderId')
  return (
    <main className="editorial-page px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50/50 p-8 text-center sm:p-12 shadow-premium">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-red-600 mt-6 block">
          Payment Not Completed
        </span>
        <h1 className="font-display mt-2 text-3xl font-bold text-foreground">
          Order could not be confirmed
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          {reason || 'The payment could not be completed. You can safely retry from checkout.'}
        </p>
        {orderId && (
          <p className="mt-3 text-xs text-neutral-400">Pending order reference: #{orderId}</p>
        )}
        <div className="flex flex-col justify-center gap-3 pt-8 sm:flex-row">
          <Link to="/checkout" className="editorial-button py-3 font-bold text-sm">
            <RefreshCw className="h-4 w-4" /> Retry Payment
          </Link>
          <Link to="/cart" className="editorial-button-secondary py-3 font-bold text-sm">
            Return to Cart <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}

export default OrderFailurePage
