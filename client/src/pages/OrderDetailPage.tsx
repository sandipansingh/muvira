import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Truck, ShieldCheck, MapPin, ArrowLeft } from 'lucide-react'
import { formatPrice } from '../lib/utils/format'

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const orderId = id || 'ORD-849201'

  return (
    <main className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Order History
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C88D35]">
              Order Details
            </span>
            <h1 className="font-serif text-3xl font-bold text-zinc-900 mt-0.5">#{orderId}</h1>
            <p className="text-xs text-zinc-500 mt-1">Placed on August 5, 2026</p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full">
            STATUS: CONFIRMED
          </span>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-[#F6F4EF] p-6 rounded-3xl border border-zinc-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#C88D35]" />
            <h3 className="font-serif text-lg font-bold text-zinc-900">Shiprocket Tracking</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-zinc-200">
              <span className="text-zinc-400 block">AWB Tracking Number</span>
              <strong className="text-zinc-900 text-sm">SR89201948</strong>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200">
              <span className="text-zinc-400 block">Courier Partner</span>
              <strong className="text-zinc-900 text-sm">Shiprocket Air Express</strong>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200">
              <span className="text-zinc-400 block">Estimated Arrival</span>
              <strong className="text-emerald-700 text-sm">Aug 9, 2026</strong>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-zinc-900">Ordered Items</h3>
          <div className="p-4 bg-[#F6F4EF] rounded-2xl border border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80"
                alt=""
                className="w-16 h-16 rounded-xl object-cover bg-white"
              />
              <div>
                <h4 className="font-serif font-bold text-base text-zinc-900">
                  Hollis 3-Seater Sofa
                </h4>
                <p className="text-xs text-zinc-500">Fabric: Neutral Bouclé • Solid Oak Frame</p>
                <p className="text-xs text-zinc-700 font-semibold mt-1">Qty: 1</p>
              </div>
            </div>
            <span className="font-sans font-bold text-base text-zinc-900">
              {formatPrice(214000)}
            </span>
          </div>
        </div>

        {/* Shipping Address & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <div className="p-6 bg-white rounded-2xl border border-zinc-200 space-y-2 text-xs">
            <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C88D35]" /> Shipping Address
            </h4>
            <p className="text-zinc-700 font-medium">Priya Nair (Home)</p>
            <p className="text-zinc-500">221 Birchwood Lane, Apt 4B</p>
            <p className="text-zinc-500">Austin, TX 78701 — (512) 555-0148</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-zinc-200 space-y-2 text-xs">
            <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C88D35]" /> Payment Details
            </h4>
            <p className="text-zinc-700 font-medium">Razorpay Online Payment</p>
            <p className="text-emerald-700 font-semibold">Payment Status: CAPTURED</p>
            <p className="text-zinc-500">Transaction Ref: pay_Rz90184201</p>
          </div>
        </div>
      </div>
    </main>
  )
}
