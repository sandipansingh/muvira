import React from 'react'
import { ArrowRight, ShoppingBag, Truck, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
    hasUnmergedItems,
    loading,
  } = useCart()
  const navigate = useNavigate()
  if (!isDrawerOpen) return null

  const freeShippingPercent =
    freeShippingThresholdPaisa > 0
      ? Math.min(
          100,
          Math.round(
            ((freeShippingThresholdPaisa - amountForFreeShippingPaisa) /
              freeShippingThresholdPaisa) *
              100
          )
        )
      : 0

  const openCheckout = () => {
    closeCartDrawer()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        type="button"
        className="fixed inset-0 h-full w-full bg-slate-900/50 backdrop-blur-xs"
        onClick={closeCartDrawer}
        aria-label="Close cart"
      />
      <aside
        className="fixed inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-slate-200/80 bg-white shadow-2xl"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-slate-800" />
            <h2 className="font-serif text-xl font-bold text-slate-900">Your Cart</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
              {items.reduce((total, item) => total + item.quantity, 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200/80 bg-slate-50/90 px-6 py-3.5 text-xs font-medium">
          {amountForFreeShippingPaisa > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-slate-600">
                <Truck className="h-4 w-4 text-slate-700" /> Add{' '}
                <strong className="font-bold text-slate-900">
                  {formatPrice(amountForFreeShippingPaisa)}
                </strong>{' '}
                for free shipping.
              </p>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-[width] duration-500 rounded-full"
                  style={{ width: `${freeShippingPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 font-bold text-emerald-600">
              <Truck className="h-4 w-4 text-emerald-600" /> Free shipping unlocked!
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 font-serif text-lg font-bold text-slate-900">
                Your cart is empty
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                Explore our solid wood furniture and handcrafted collections to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#7e3d1c] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#7e3d1c]/20 transition-all hover:bg-[#693116] active:scale-95"
              >
                <span>Shop the collection</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} />)
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-4 border-t border-slate-200/80 bg-slate-50/90 p-6">
            <CouponInput />
            <div className="space-y-2 border-t border-slate-200/80 pt-4 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated shipping</span>
                <span className="font-bold text-slate-900">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-3 text-base font-extrabold text-slate-900">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-800 shadow-xs transition-all hover:bg-slate-100"
              >
                View cart
              </Link>
              <button
                type="button"
                onClick={openCheckout}
                disabled={loading || hasUnmergedItems}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#7e3d1c] py-3 text-xs font-bold text-white shadow-md shadow-[#7e3d1c]/20 transition-all hover:bg-[#693116] active:scale-95 disabled:opacity-50"
              >
                <span>{hasUnmergedItems ? 'Resolve saved items' : 'Checkout'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
