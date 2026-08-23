import React from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

interface CartItemRowProps {
  item: CartItem
  variant?: 'compact' | 'full'
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, variant = 'compact' }) => {
  const { updateQuantity, removeFromCart, loading } = useCart()

  if (variant === 'full') {
    return (
      <article className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 transition-shadow hover:shadow-xs">
        <Link
          to={`/product/${item.productSlug}`}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] sm:h-28 sm:w-28"
          aria-label={`View ${item.productName}`}
        >
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={item.productName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              No image
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                to={`/product/${item.productSlug}`}
                className="font-display text-base sm:text-lg font-bold text-[var(--color-ink)] transition-colors hover:text-ink-soft line-clamp-2"
              >
                {item.productName}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => removeFromCart(item.productId)}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-none text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              aria-label={`Remove ${item.productName} from cart`}
              title="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden leading-none sm:inline">Remove</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, -1)}
                  disabled={loading}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-[var(--color-ink)]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, 1)}
                  disabled={loading}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                {formatPrice(item.unitPrice)} each
              </span>
            </div>

            <div className="text-right">
              <span className="block text-xs font-medium text-[var(--color-muted)]">Subtotal</span>
              <span className="font-display text-base font-bold text-[var(--color-ink)] sm:text-lg">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="flex gap-3 border-b border-[var(--color-line)] pb-3.5">
      <Link
        to={`/product/${item.productSlug}`}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)]"
        aria-label={`View ${item.productName}`}
      >
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <Link
            to={`/product/${item.productSlug}`}
            className="line-clamp-2 font-display text-xs font-semibold leading-snug text-[var(--color-ink)] transition-colors hover:text-ink-soft"
          >
            {item.productName}
          </Link>
          <button
            type="button"
            onClick={() => removeFromCart(item.productId)}
            disabled={loading}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded p-0.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            aria-label={`Remove ${item.productName}`}
            title="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, -1)}
              disabled={loading}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-[var(--color-ink)]">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, 1)}
              disabled={loading}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-display text-xs font-bold text-[var(--color-ink)]">
              {formatPrice(item.lineTotal)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-[var(--color-muted)]">
                {formatPrice(item.unitPrice)} ea
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default CartItemRow
