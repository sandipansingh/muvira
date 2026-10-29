import { motion, useReducedMotion } from 'framer-motion'
import React, { useRef } from 'react'
import { ShoppingBag, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAuthDialog } from '../../context/AuthDialogContext'
import { formatPrice } from '../../lib/utils/format'
import { CartItemRow } from './CartItemRow'
import { CouponInput } from './CouponInput'
import { useDialogFocus } from '../../lib/hooks/useDialogFocus'

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
    error,
    status,
    retry,
  } = useCart()
  const reducedMotion = useReducedMotion()
  const { isAuthenticated } = useAuth()
  const { openAuth } = useAuthDialog()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLElement>(null)
  useDialogFocus(isDrawerOpen, closeCartDrawer, panelRef, () =>
    document.querySelector<HTMLElement>('[data-auth-focus="bag"]')
  )
  if (!isDrawerOpen) return null

  const openCheckout = () => {
    closeCartDrawer()
    if (isAuthenticated) navigate('/checkout')
    else openAuth({ mode: 'signin', returnTo: '/checkout', fallbackFocus: 'bag' })
  }

  const totalItemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-[var(--z-drawer)] overflow-hidden animate-in fade-in duration-200">
      <button
        type="button"
        className="fixed inset-0 h-full w-full bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={closeCartDrawer}
        aria-label="Close cart drawer"
      />
      <motion.aside
        initial={reducedMotion ? false : { x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-10 cart-drawer-panel flex h-dvh w-full flex-col border-l border-line pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-overlay"
        aria-label="Shopping cart"
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header flex shrink-0 items-center justify-between gap-3 border-b border-line">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-2xl text-ink">Your shopping bag</h2>
            <span className="text-sm tabular-nums text-ink-soft">{totalItemCount}</span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="cart-drawer-items min-h-0 flex-1 overflow-y-auto">
          {status !== 'ready' ? (
            <div role="status" className="py-10 text-center">
              <p>{status === 'error' ? error : 'Loading your cart…'}</p>
              {status === 'error' && (
                <button type="button" className="button-primary mt-4" onClick={retry}>
                  Retry loading cart
                </button>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface)] text-muted">
                <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">Your cart is empty</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-base leading-relaxed text-[var(--color-muted)]">
                Browse the current catalog to add products to your cart.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCartDrawer()
                  navigate('/shop')
                }}
                className="button-primary mt-5 px-4 py-2 text-xs"
              >
                <span className="leading-none">Shop the collection</span>
              </button>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} variant="compact" />)
          )}
        </div>

        {/* Cart Summary & Footer Actions */}
        {status === 'ready' && items.length > 0 && (
          <div className="cart-drawer-summary space-y-4 border-t border-line">
            <CouponInput />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <div className="space-y-2 border-t border-line pt-3 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-product font-normal text-[var(--color-ink)]">
                  {formatPrice(subtotalPaisa)}
                </span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between font-normal text-primary">
                  <span>Discount</span>
                  <span className="font-product">-{formatPrice(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated shipping</span>
                <span className="font-product font-normal text-[var(--color-ink)]">
                  {error
                    ? 'Unavailable'
                    : shippingPaisa === 0
                      ? 'Free shipping'
                      : formatPrice(shippingPaisa)}
                </span>
              </div>
              <div className="cart-drawer-total flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-3 text-ink">
                <span>Total</span>
                <span className="font-product">
                  {error ? 'Unavailable' : formatPrice(totalPaisa)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={openCheckout}
                disabled={loading || hasUnmergedItems || Boolean(error)}
                aria-busy={loading}
                className="button-primary w-full py-3 text-base shadow-none"
              >
                <span>{hasUnmergedItems ? 'Resolve saved items' : 'Proceed to Checkout'}</span>
              </button>
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="cart-drawer-view flex min-h-[var(--tap-target)] items-center justify-center text-center text-sm underline underline-offset-4 hover:text-primary"
              >
                View shopping bag
              </Link>
            </div>
          </div>
        )}
      </motion.aside>
    </div>
  )
}

export default CartDrawer
