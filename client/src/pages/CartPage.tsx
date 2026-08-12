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
          <ShoppingBag className="mx-auto h-12 w-12 text-line" />
          <h1 className="editorial-heading mt-6 text-4xl">Your cart is empty</h1>
          <p className="mt-3 text-sm text-muted-ink">
            Looks like you have not added any handcrafted pieces yet.
          </p>
          <Link to="/shop" className="editorial-button mt-8">
            Explore the shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-12 sm:py-16">
      <div className="editorial-container">
        <div className="mb-10">
          <p className="editorial-label">Muvira / Cart</p>
          <h1 className="editorial-heading mt-3 text-4xl sm:text-6xl">Shopping cart</h1>
        </div>
        {error && (
          <p className="mb-5 border border-warning bg-warning-soft p-4 text-xs text-warning">
            {error}
          </p>
        )}
        <div className="grid items-start gap-12 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-5">
            {amountForFreeShippingPaisa > 0 ? (
              <div className="flex items-center gap-3 border-y border-line py-4 text-sm text-muted-ink">
                <Truck className="h-5 w-5 text-ink" />
                <span>
                  Add{' '}
                  <strong className="text-ink">{formatPrice(amountForFreeShippingPaisa)}</strong>{' '}
                  more to get free delivery.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 border-y border-line py-4 text-sm text-success">
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
          <aside className="border-y border-line py-6 sm:py-8">
            <h2 className="border-b border-line pb-4 font-serif text-2xl font-bold text-ink">
              Order summary
            </h2>
            <div className="my-6">
              <CouponInput />
            </div>
            <div className="space-y-3 border-t border-line pt-5 text-sm text-muted-ink">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatPrice(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-semibold text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-ink">
                  {shippingPaisa === 0 ? 'FREE' : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="flex justify-between border-t border-line pt-4 text-lg font-bold text-ink">
                <span>Total</span>
                <span>{formatPrice(totalPaisa)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={loading || hasUnmergedItems}
              className="editorial-button mt-6 w-full"
            >
              {hasUnmergedItems ? 'Resolve saved items' : 'Continue to checkout'}{' '}
              <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}
