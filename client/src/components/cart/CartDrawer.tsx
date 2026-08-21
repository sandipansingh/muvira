import React from 'react'
import { ArrowRight, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
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

  const totalItemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      <button
        type="button"
        className="fixed inset-0 h-full w-full bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={closeCartDrawer}
        aria-label="Close cart drawer"
      />
      <aside
        className="fixed inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-[var(--kit-line)] bg-[var(--kit-paper)] shadow-2xl"
        aria-label="Shopping cart"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--kit-line)] bg-[var(--kit-paper)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4.5 w-4.5 text-[var(--kit-ink)]" />
            <h2 className="font-display text-base font-bold text-[var(--kit-ink)]">Your Cart</h2>
            <span className="rounded-full bg-[var(--kit-surface)] px-2 py-0.5 text-[11px] font-bold text-[var(--kit-muted)]">
              {totalItemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="cursor-pointer rounded-full p-1.5 text-[var(--kit-muted)] transition-colors hover:bg-[var(--kit-surface)] hover:text-[var(--kit-ink)]"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Free Shipping Banner */}
        <div className="border-b border-[var(--kit-line)] bg-[var(--kit-surface)]/60 px-5 py-2.5 text-xs font-medium">
          {amountForFreeShippingPaisa > 0 ? (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--kit-muted)]">
                <Truck className="h-3.5 w-3.5 shrink-0 text-[var(--kit-ink)]" />
                <span>
                  Add{' '}
                  <strong className="font-bold text-[var(--kit-ink)]">
                    {formatPrice(amountForFreeShippingPaisa)}
                  </strong>{' '}
                  more for free shipping.
                </span>
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-[var(--kit-ink)] transition-all duration-300"
                  style={{ width: `${freeShippingPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>Free shipping unlocked for this order!</span>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 dropdown-scrollbar">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kit-surface)] text-neutral-400">
                <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-[var(--kit-ink)]">
                Your cart is empty
              </h3>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--kit-muted)]">
                Explore our solid wood furniture and handcrafted decor collections to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="kit-button mt-5 px-4 py-2 text-xs font-semibold"
              >
                <span>Shop the collection</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} variant="compact" />)
          )}
        </div>

        {/* Cart Summary & Footer Actions */}
        {items.length > 0 && (
          <div className="space-y-3.5 border-t border-[var(--kit-line)] bg-[var(--kit-paper)] p-5 shadow-xs">
            <CouponInput />

            <div className="space-y-1.5 border-t border-[var(--kit-line)] pt-3 text-xs font-medium text-[var(--kit-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--kit-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated shipping</span>
                <span className="font-bold text-[var(--kit-ink)]">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--kit-line)] pt-2.5 text-sm font-bold text-[var(--kit-ink)]">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="editorial-button-secondary py-2.5 text-xs text-center justify-center font-bold rounded-lg"
              >
                View Cart
              </Link>
              <button
                type="button"
                onClick={openCheckout}
                disabled={loading || hasUnmergedItems}
                className="kit-button col-span-2 py-2.5 text-xs font-bold rounded-lg shadow-xs"
              >
                <span>{hasUnmergedItems ? 'Resolve saved items' : 'Proceed to Checkout'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[10px] font-medium text-[var(--kit-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>100% Secure Checkout · 7-Day Returns</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default CartDrawer
