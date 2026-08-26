import React from 'react'
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2, ShieldCheck, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/utils/format'
import { CartItemRow } from '../components/cart/CartItemRow'
import { CouponInput } from '../components/cart/CouponInput'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

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
      <main className="editorial-page min-h-[70vh] px-4 py-12 sm:px-6 lg:px-8">
        <div className="editorial-container mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--color-surface)] text-[var(--color-muted)] shadow-xs">
            <ShoppingBag className="h-12 w-12 stroke-[1.5] text-[var(--color-primary)]" />
          </div>
          <h1 className="heading page-title mt-6">Your cart is empty</h1>
          <p className="body-copy mx-auto mt-3 max-w-sm text-sm text-[var(--color-muted)]">
            Explore our curated collections of handcrafted wooden decor, statues, and home art.
          </p>
          <Link
            to="/shop"
            className="button-primary mt-8 inline-flex gap-2 px-6 py-3.5 text-sm font-semibold"
          >
            <span className="leading-none">Explore Collections</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-6 sm:py-10">
      <div className="editorial-container space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shopping Cart' }]} />

        {/* Page Header */}
        <div className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--color-line)]">
          <div>
            <h1 className="heading page-title">Shopping Cart</h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-muted)]">
              You have{' '}
              <strong className="text-[var(--color-ink)] font-semibold">{itemCount}</strong>{' '}
              {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-none">Clear Cart</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs font-normal text-warning">
            {error}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10">
          {/* Main Items Section */}
          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            {/* Cart Items List */}
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} variant="full" />
              ))}
            </div>

            {/* Navigation / Continue Shopping */}
            <div className="pt-4 flex items-center justify-between">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="leading-none">Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <aside className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-6 space-y-5 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 lg:self-start shadow-xs">
            <h2 className="border-b border-[var(--color-line)] pb-3 font-display text-lg font-bold text-[var(--color-ink)]">
              Order Summary
            </h2>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-ink)]">
                Have a promo code?
              </label>
              <CouponInput />
            </div>

            <div className="space-y-3 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-muted)]">
              <div className="flex justify-between">
                <span>
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-medium text-[var(--color-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-semibold text-accent">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                  Delivery Charge
                </span>
                <span className="font-medium text-[var(--color-ink)]">
                  {shippingPaisa === 0 ? (
                    <span className="text-accent font-bold">FREE</span>
                  ) : (
                    formatPrice(shippingPaisa)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-base font-bold text-[var(--color-ink)]">
                <span>Total</span>
                <span className="font-sans text-xl font-bold text-[var(--color-primary)]">
                  {formatPrice(totalPaisa)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="button-primary w-full py-3.5 text-sm font-semibold shadow-xs hover:shadow-sm"
            >
              <span>{hasUnmergedItems ? 'Resolve saved items' : 'Proceed to Checkout'}</span>
            </button>

            <div className="flex items-center justify-center gap-2 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
              <span>Guaranteed 256-bit SSL encrypted checkout</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default CartPage
