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
      <main className="editorial-page px-4 py-20 sm:px-6 lg:px-8">
        <div className="editorial-container mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--kit-surface)] text-neutral-400">
            <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
          </div>
          <h1 className="kit-heading mt-6 text-3xl sm:text-4xl">Your cart is empty</h1>
          <p className="kit-body-copy mx-auto mt-3 max-w-sm text-sm text-[var(--kit-muted)]">
            Looks like you have not added any handcrafted pieces yet. Discover our artisanal wooden
            decor and statues.
          </p>
          <Link to="/shop" className="kit-button mt-8 gap-2.5 px-6 py-3 text-sm font-semibold">
            <span>Explore Handcrafted Collections</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-8 sm:py-12">
      <div className="editorial-container">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs font-medium text-[var(--kit-muted)]"
        >
          <Link to="/" className="hover:text-[var(--kit-ink)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--kit-ink)]">Shopping Cart</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--kit-line)] pb-6">
          <div>
            <h1 className="kit-heading text-3xl sm:text-5xl">Shopping Cart</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--kit-muted)]">
              You have <strong className="text-[var(--kit-ink)]">{itemCount}</strong>{' '}
              {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-900">
            {error}
          </div>
        )}

        <div className="grid items-start gap-10 lg:grid-cols-[1.6fr_1fr] xl:gap-14">
          {/* Items Section */}
          <div className="space-y-6">
            {/* Cart Items List */}
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} variant="full" />
              ))}
            </div>

            {/* Navigation / Continue Shopping */}
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--kit-ink)] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <aside className="kit-panel space-y-6 p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="border-b border-[var(--kit-line)] pb-4 font-display text-xl font-bold text-[var(--kit-ink)]">
              Order Summary
            </h2>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--kit-ink)]">
                Have a coupon?
              </label>
              <CouponInput />
            </div>

            <div className="space-y-3 border-t border-[var(--kit-line)] pt-5 text-sm text-[var(--kit-muted)]">
              <div className="flex justify-between">
                <span>
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-[var(--kit-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-semibold text-[var(--kit-ink)]">
                  {shippingPaisa === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatPrice(shippingPaisa)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--kit-line)] pt-4 text-lg font-bold text-[var(--kit-ink)]">
                <span>Total Amount</span>
                <span className="font-display text-xl">{formatPrice(totalPaisa)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="kit-button w-full py-3.5 text-sm font-bold shadow-xs hover:shadow-sm"
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
