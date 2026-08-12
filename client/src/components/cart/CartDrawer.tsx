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
        className="fixed inset-0 h-full w-full bg-ink/50"
        onClick={closeCartDrawer}
        aria-label="Close cart"
      />
      <aside
        className="fixed inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-rule bg-paper shadow-overlay"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-ink" />
            <h2 className="font-serif text-xl font-bold text-ink">Your Cart</h2>
            <span className="rounded-pill bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
              {items.reduce((total, item) => total + item.quantity, 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="rounded-pill p-1.5 text-muted-ink transition-colors duration-control hover:bg-surface hover:text-ink"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-rule px-6 py-3.5 text-xs font-medium">
          {amountForFreeShippingPaisa > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-ink">
                <Truck className="h-4 w-4 text-ink" /> Add{' '}
                <strong className="font-bold text-ink">
                  {formatPrice(amountForFreeShippingPaisa)}
                </strong>{' '}
                for free shipping.
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface">
                <div
                  className="h-full rounded-pill bg-ink transition-[width] duration-control"
                  style={{ width: `${freeShippingPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 font-bold text-success">
              <Truck className="h-4 w-4" /> Free shipping unlocked!
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-rule" />
              <h3 className="mt-4 font-serif text-lg font-bold text-ink">Your cart is empty</h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-ink">
                Explore our solid wood furniture and handcrafted collections to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="editorial-button mt-6"
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
          <div className="space-y-4 border-t border-rule p-6">
            <CouponInput />
            <div className="space-y-2 border-t border-rule pt-4 text-xs font-medium text-muted-ink">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-ink">{formatPrice(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-bold text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated shipping</span>
                <span className="font-bold text-ink">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-rule pt-3 text-base font-bold text-ink">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="flex items-center justify-center rounded-control border border-rule py-3 text-xs font-semibold text-ink transition-colors duration-control hover:border-ink"
              >
                View cart
              </Link>
              <button
                type="button"
                onClick={openCheckout}
                disabled={loading || hasUnmergedItems}
                className="editorial-button col-span-2"
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
