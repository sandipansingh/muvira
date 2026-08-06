import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/utils/format'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CouponInput } from '../components/cart/CouponInput'

export const CartPage: React.FC = () => {
  const {
    items,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa,
    totalPaisa,
    amountForFreeShippingPaisa,
  } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <main className="bg-white min-h-screen py-20 px-4">
        <div className="max-w-md mx-auto text-center space-y-4">
          <ShoppingBag className="w-16 h-16 text-zinc-300 mx-auto" />
          <h1 className="font-serif text-3xl font-bold text-zinc-900">Your Cart is Empty</h1>
          <p className="text-sm text-zinc-500">
            Looks like you haven't added any handcrafted pieces yet.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white font-semibold text-xs uppercase tracking-wider rounded-full hover:bg-[#C88D35] transition-colors"
          >
            Explore Shop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 mb-8">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left: Items list */}
          <div className="lg:col-span-2 space-y-4">
            {amountForFreeShippingPaisa > 0 ? (
              <div className="bg-[#F6F4EF] p-4 rounded-2xl border border-zinc-200 text-xs text-zinc-700 flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#C88D35] shrink-0" />
                <span>
                  Add <strong>{formatPrice(amountForFreeShippingPaisa)}</strong> more to get FREE
                  White-Glove Delivery!
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
                <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>You unlocked FREE White-Glove Delivery across India!</span>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Right: Summary */}
          <div className="bg-[#F6F4EF] p-6 sm:p-8 rounded-3xl border border-zinc-200/80 space-y-6">
            <h3 className="font-serif text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-4">
              Order Summary
            </h3>

            <CouponInput />

            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{formatPrice(subtotalPaisa)}</span>
              </div>

              {discountPaisa > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-zinc-900">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-300 font-bold text-lg text-zinc-900">
                <span>Total</span>
                <span className="text-[#C88D35]">{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-zinc-900 hover:bg-[#C88D35] text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
