import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'

export const OrderFailurePage: React.FC = () => {
  return (
    <main className="bg-[#FDFBF7] min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-zinc-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-red-600 uppercase tracking-widest">
            Payment Unsuccessful
          </span>
          <h1 className="font-serif text-3xl font-bold text-zinc-900">Order Could Not Be Placed</h1>
        </div>

        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-light">
          Your payment attempt was declined by the bank or cancelled. Don't worry—no amount was
          charged from your account. If funds were debited, they will automatically be refunded
          within 3–5 business days.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Link
            to="/checkout"
            className="px-6 py-3 bg-zinc-900 text-white font-semibold text-xs rounded-full hover:bg-[#C88D35] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry Payment
          </Link>
          <Link
            to="/cart"
            className="px-6 py-3 bg-[#F6F4EF] text-zinc-900 font-semibold text-xs rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1 border border-zinc-200"
          >
            Return to Cart <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  )
}
