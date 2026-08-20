import React from 'react'
import { ArrowRight, ShoppingBag, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
    loading,
    error,
    hasUnmergedItems,
  } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <main className="editorial-page px-4 py-20 sm:px-6 lg:px-8">
        <div className="editorial-container mx-auto max-w-md text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
          <h1 className="kit-heading mt-6 text-3xl sm:text-4xl">Your cart is empty</h1>
          <p className="kit-body-copy mt-3 text-sm">
            Looks like you have not added any handcrafted pieces yet.
          </p>
          <Link to="/shop" className="kit-button mt-8">
            Explore the Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="editorial-container">
        <div className="kit-page-header mb-10">
          <span className="kit-eyebrow mb-2 block">Muvira / Checkout</span>
          <h1 className="kit-heading text-4xl sm:text-6xl">Shopping Cart</h1>
        </div>

        {error && (
          <p className="mb-5 border border-warning bg-warning-soft p-4 text-xs font-semibold text-warning">
            {error}
          </p>
        )}

        <div className="grid items-start gap-12 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-5">
            {amountForFreeShippingPaisa > 0 ? (
              <div className="flex items-center gap-3 border-y border-[var(--kit-line)] py-4 text-xs text-[var(--kit-muted)] sm:text-sm">
                <Truck className="h-5 w-5 text-foreground" />
                <span>
                  Add{' '}
                  <strong className="text-[var(--kit-ink)]">
                    {formatPrice(amountForFreeShippingPaisa)}
                  </strong>{' '}
                  more to unlock free doorstep delivery.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 border-y border-[var(--kit-line)] py-4 text-xs font-semibold text-emerald-700 sm:text-sm">
                <Truck className="h-5 w-5" />
                <span>Free delivery is unlocked for this order.</span>
              </div>
            )}
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          <aside className="kit-panel p-6 sm:p-8">
            <h2 className="border-b border-[var(--kit-line)] pb-4 font-display text-xl font-bold text-[var(--kit-ink)]">
              Order Summary
            </h2>
            <div className="my-6">
              <CouponInput />
            </div>
            <div className="space-y-3 border-t border-[var(--kit-line)] pt-5 text-sm text-[var(--kit-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--kit-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-[var(--kit-ink)]">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--kit-line)] pt-4 text-lg font-bold text-[var(--kit-ink)]">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="kit-button mt-6 w-full py-3.5 text-sm"
            >
              {hasUnmergedItems ? 'Resolve saved items' : 'Continue to Checkout'}{' '}
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default CartPage
