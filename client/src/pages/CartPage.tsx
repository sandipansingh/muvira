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
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
          <h1 className="font-display mt-6 text-3xl sm:text-4xl font-bold text-foreground">
            Your cart is empty
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Looks like you have not added any handcrafted pieces yet.
          </p>
          <Link to="/shop" className="editorial-button mt-8">
            Explore the Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="layout-container">
        <div className="mb-10 max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">
            Muvira / Checkout
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Shopping Cart
          </h1>
        </div>

        {error && (
          <p className="mb-5 border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 rounded-2xl">
            {error}
          </p>
        )}

        <div className="grid items-start gap-12 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-5">
            {amountForFreeShippingPaisa > 0 ? (
              <div className="flex items-center gap-3 border-y border-border-light py-4 text-xs sm:text-sm text-neutral-600">
                <Truck className="h-5 w-5 text-foreground" />
                <span>
                  Add{' '}
                  <strong className="text-foreground">
                    {formatPrice(amountForFreeShippingPaisa)}
                  </strong>{' '}
                  more to unlock free doorstep delivery.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 border-y border-border-light py-4 text-xs sm:text-sm text-emerald-700 font-semibold">
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

          <aside className="rounded-3xl border border-border-light bg-neutral-50/60 p-6 sm:p-8">
            <h2 className="border-b border-border-light pb-4 font-display text-xl font-bold text-foreground">
              Order Summary
            </h2>
            <div className="my-6">
              <CouponInput />
            </div>
            <div className="space-y-3 border-t border-border-light pt-5 text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-foreground">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border-light pt-4 text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="editorial-button mt-6 w-full py-3.5 text-sm font-bold"
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
