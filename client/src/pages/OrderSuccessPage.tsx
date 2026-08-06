import React from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, Truck, Package, ShieldCheck, ArrowRight } from 'lucide-react'

export const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || 'ORD-849201'

  return (
    <main className="bg-[#FDFBF7] min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-zinc-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#C88D35] uppercase tracking-widest">
            Payment Verified
          </span>
          <h1 className="font-serif text-3xl font-bold text-zinc-900">Thank You for Your Order!</h1>
          <p className="text-sm text-zinc-500 font-medium">Order Reference: #{orderId}</p>
        </div>

        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-light max-w-md mx-auto">
          We have sent an order confirmation and Tax Invoice receipt to your registered email
          address. Our Jaipur workshop team is now preparing your handcrafted pieces.
        </p>

        {/* Tracking Preview */}
        <div className="bg-[#F6F4EF] p-5 rounded-2xl border border-zinc-200/80 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-900">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#C88D35]" /> Shiprocket Express Tracking
            </span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
              CONFIRMED
            </span>
          </div>

          <div className="space-y-2 text-xs text-zinc-600">
            <p>
              • <strong>Estimated Delivery:</strong> 3–5 Business Days
            </p>
            <p>
              • <strong>Courier Partner:</strong> Shiprocket Air Express (AWB #SR89201948)
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Link
            to={`/orders/${orderId}`}
            className="px-6 py-3 bg-zinc-900 text-white font-semibold text-xs rounded-full hover:bg-[#C88D35] transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" /> Track Order Status
          </Link>
          <Link
            to="/shop"
            className="px-6 py-3 bg-[#F6F4EF] text-zinc-900 font-semibold text-xs rounded-full hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1 border border-zinc-200"
          >
            Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-4 border-t border-zinc-100">
          <ShieldCheck className="w-4 h-4 text-[#C88D35]" />
          <span>Covered by Muvira 15-Year Solid Timber Warranty</span>
        </div>
      </div>
    </main>
  )
}
