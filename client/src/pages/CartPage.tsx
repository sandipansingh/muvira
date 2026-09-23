import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { FlowHeader } from '../components/checkout/FlowHeader'
import { FlowItemCard } from '../components/checkout/FlowItemCard'
import { FlowCartSidebar } from '../components/checkout/FlowCartSidebar'
import { RecommendedUpsell } from '../components/checkout/RecommendedUpsell'

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
      <main className="min-h-[75vh] bg-[var(--color-paper)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--color-surface)] text-[var(--color-muted)] shadow-xs">
            <ShoppingBag className="h-12 w-12 stroke-[1.5] text-[var(--color-primary)]" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)] mt-6">
            Your cart is empty
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base text-[var(--color-muted)]">
            Browse the current catalog to add products to your cart.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-hover)]"
          >
            <span>Explore Collections</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Flow Header */}
        <FlowHeader currentStep="cart" onBack={() => navigate('/shop')} />

        {/* Error notification if any */}
        {error && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs font-medium text-warning">
            {error}
          </div>
        )}

        <div className="mt-6 sm:mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Main Left Column: Order Summary with Item Cards & Recommended Upsell */}
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <section className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-7 shadow-xs space-y-6">
              {/* Header with Clear Cart */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] pb-4">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-ink)]">
                    Order Summary
                  </h1>
                  <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void clearCart().catch(() => undefined)}
                  disabled={loading}
                  className="cursor-pointer text-xs font-medium text-[var(--color-muted)] hover:text-danger transition-colors disabled:opacity-50"
                >
                  Clear Cart
                </button>
              </div>

              {/* List of Item Cards matching Reference #1 */}
              <div className="space-y-3.5">
                {items.map((item) => (
                  <FlowItemCard key={item.id} item={item} />
                ))}
              </div>

              {/* Continue Shopping Link */}
              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-flex min-h-[var(--tap-target)] items-center gap-2 text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </section>

            {/* Recommended Upsell Carousel matching bottom-left of Reference #1 */}
            <RecommendedUpsell />
          </div>

          {/* Right Column: Sticky Your Cart Summary matching Reference #2 */}
          <div className="lg:col-span-5 xl:col-span-4">
            <FlowCartSidebar
              items={items}
              subtotalPaisa={subtotalPaisa}
              discountPaisa={discountPaisa}
              shippingPaisa={shippingPaisa}
              totalPaisa={totalPaisa}
              onProceed={() => navigate('/checkout?step=shipping')}
              buttonLabel="Proceed to Checkout"
              disabled={hasUnmergedItems}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default CartPage
