import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/utils/format'
import { CartItemRow } from './CartItemRow'
import { CouponInput } from './CouponInput'

export const CartDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    closeCartDrawer,
    items,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa,
    totalPaisa,
    amountForFreeShippingPaisa,
    freeShippingThresholdPaisa,
  } = useCart()

  const navigate = useNavigate()

  if (!isDrawerOpen) return null

  const freeShippingPct = Math.min(
    100,
    Math.round(
      ((freeShippingThresholdPaisa - amountForFreeShippingPaisa) / freeShippingThresholdPaisa) * 100
    )
  )

  const handleCheckoutClick = () => {
    closeCartDrawer()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-10 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C88D35]" />
            <h3 className="font-serif text-xl font-bold text-zinc-900">Your Cart</h3>
            <span className="text-xs bg-[#F6F4EF] text-zinc-700 px-2.5 py-0.5 rounded-full font-bold">
              {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={closeCartDrawer}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="bg-[#F6F4EF] px-6 py-3 border-b border-zinc-200/80 text-xs">
          {amountForFreeShippingPaisa > 0 ? (
            <div className="space-y-1.5">
              <p className="text-zinc-700 font-medium flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#C88D35]" /> Add{' '}
                <strong className="text-zinc-900 font-bold">
                  {formatPrice(amountForFreeShippingPaisa)}
                </strong>{' '}
                more for FREE White-Glove Shipping!
              </p>
              <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C88D35] transition-all duration-500"
                  style={{ width: `${freeShippingPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" /> You unlocked FREE White-Glove Shipping!
            </p>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto" />
              <p className="font-serif text-lg font-bold text-zinc-800">Your cart is empty</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Explore our solid wood furniture and handcrafted collections to get started.
              </p>
              <button
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white font-semibold text-xs rounded-full hover:bg-[#C88D35]"
              >
                Shop All Collections <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} />)
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {items.length > 0 && (
          <div className="p-6 bg-[#F6F4EF] border-t border-zinc-200 space-y-4">
            <CouponInput />

            {/* Price breakdown */}
            <div className="space-y-2 text-xs text-zinc-600 pt-2 border-t border-zinc-200">
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
                <span>Estimated Shipping</span>
                <span className="font-semibold text-zinc-900">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-zinc-300 font-bold text-base text-zinc-900">
                <span>Total</span>
                <span className="text-[#C88D35]">{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="w-1/3 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-xs rounded-xl border border-zinc-300 text-center"
              >
                View Cart
              </Link>
              <button
                onClick={handleCheckoutClick}
                className="w-2/3 py-3 bg-zinc-900 hover:bg-[#C88D35] text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
