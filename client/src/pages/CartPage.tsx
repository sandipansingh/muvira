import React from 'react'
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/utils/format'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CouponInput } from '../components/cart/CouponInput'

export const CartPage: React.FC = () => {
  const {
    items,
    itemCount,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa,
    totalPaisa,
    loading,
    error,
    hasUnmergedItems,
    clearCart,
  } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <main className="editorial-page px-4 py-12 sm:px-6 lg:px-8">
        <div className="editorial-container mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-surface)] text-muted">
            <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
          </div>
          <h1 className="heading page-title mt-5">Your cart is empty</h1>
          <p className="body-copy mx-auto mt-3 max-w-sm text-sm text-[var(--color-muted)]">
            Looks like you have not added any handcrafted pieces yet. Discover our artisanal wooden
            decor and statues.
          </p>
          <Link to="/shop" className="button-primary mt-6 gap-2 px-5 py-3 text-sm font-bold">
            <span className="leading-none">Explore Handcrafted Collections</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-6 sm:py-8">
      <div className="editorial-container">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-xs font-normal text-[var(--color-muted)]"
        >
          <Link to="/" className="hover:text-[var(--color-ink)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="font-bold text-[var(--color-ink)]">Shopping Cart</span>
        </nav>

        {/* Page Header */}
        <div className="mb-4 flex flex-col gap-2 border-b border-[var(--color-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="heading page-title">Shopping Cart</h1>
            <p className="mt-2 text-xs sm:text-sm text-[var(--color-muted)]">
              You have <strong className="text-[var(--color-ink)]">{itemCount}</strong>{' '}
              {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs font-bold leading-none text-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-none">Clear Cart</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs font-normal text-warning">
            {error}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.85fr)] lg:gap-8 xl:gap-10">
          {/* Items Section */}
          <div className="space-y-4">
            {/* Cart Items List */}
            <div className="space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} variant="full" />
              ))}
            </div>

            {/* Navigation / Continue Shopping */}
            <div className="pt-1">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-xs font-bold leading-none text-ink hover:text-primary hover:underline sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="leading-none">Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <aside className="panel space-y-4 p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="border-b border-[var(--color-line)] pb-3 font-display text-lg font-bold text-[var(--color-ink)]">
              Order Summary
            </h2>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--color-ink)]">
                Have a coupon?
              </label>
              <CouponInput />
            </div>

            <div className="space-y-2.5 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-muted)]">
              <div className="flex justify-between">
                <span>
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-bold text-[var(--color-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-bold text-accent">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-bold text-[var(--color-ink)]">
                  {shippingPaisa === 0 ? (
                    <span className="text-accent font-bold">FREE</span>
                  ) : (
                    formatPrice(shippingPaisa)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-base font-bold text-[var(--color-ink)]">
                <span>Total Amount</span>
                <span className="font-display text-lg">{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="button-primary w-full py-3 text-sm font-bold shadow-xs hover:shadow-sm"
            >
              <span>{hasUnmergedItems ? 'Resolve saved items' : 'Proceed to Checkout'}</span>
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default CartPage
