import React from 'react'
import { ArrowRight, ShoppingBag, X } from 'lucide-react'
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
    hasUnmergedItems,
    loading,
  } = useCart()
  const navigate = useNavigate()
  if (!isDrawerOpen) return null

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
        className="fixed inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-[var(--color-line)] bg-[var(--color-paper)] shadow-2xl"
        aria-label="Shopping cart"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4.5 w-4.5 text-[var(--color-ink)]" />
            <h2 className="font-display text-base font-normal text-[var(--color-ink)]">
              Your Cart
            </h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-normal text-[var(--color-muted)]">
              {totalItemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="cursor-pointer rounded-[var(--radius-control)] p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 dropdown-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface)] text-muted">
                <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="mt-4 font-display text-base font-normal text-[var(--color-ink)]">
                Your cart is empty
              </h3>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--color-muted)]">
                Explore our solid wood furniture and handcrafted decor collections to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="button-primary mt-5 px-4 py-2 text-xs font-normal"
              >
                <span className="leading-none">Shop the collection</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} variant="compact" />)
          )}
        </div>

        {/* Cart Summary & Footer Actions */}
        {items.length > 0 && (
          <div className="space-y-3 border-t border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-xs">
            <CouponInput />

            <div className="space-y-1 border-t border-[var(--color-line)] pt-2.5 text-[11px] font-normal text-[var(--color-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-normal text-[var(--color-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-normal text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated shipping</span>
                <span className="font-normal text-[var(--color-ink)]">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-2 text-xs font-normal text-[var(--color-ink)]">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="button-secondary h-10 !min-h-0 rounded-lg py-0 text-center !text-xs font-normal justify-center"
              >
                View Cart
              </Link>
              <button
                type="button"
                onClick={openCheckout}
                disabled={loading || hasUnmergedItems}
                className="button-primary col-span-2 h-10 !min-h-0 rounded-lg py-0 !text-xs font-normal shadow-xs"
              >
                <span>{hasUnmergedItems ? 'Resolve saved items' : 'Proceed to Checkout'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default CartDrawer
