import { StoreImage } from '../common/StoreImage'
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
      <article className="group relative flex flex-col gap-4 rounded-card border border-[var(--color-line)] bg-[var(--color-paper)] p-4 transition-all hover:shadow-none sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <Link
          to={`/product/${item.productSlug}`}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] sm:h-28 sm:w-28"
          aria-label={`View ${item.productName}`}
        >
          {item.productImage ? (
            <StoreImage
              framing="square"
              src={item.productImage}
              alt={item.productName}
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              No image
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to={`/product/${item.productSlug}`}
                className="line-clamp-2 font-product leading-[1.15] tracking-tight text-base font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
              >
                {item.productName}
              </Link>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                <span>{item.inStock ? `${item.availableStock} available` : 'Unavailable'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void removeFromCart(item.id).catch(() => undefined)}
                disabled={loading}
                className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                aria-label={`Remove ${item.productName} from cart`}
                title="Remove item"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
                <button
                  type="button"
                  onClick={() => void updateQuantity(item.id, -1).catch(() => undefined)}
                  disabled={loading}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-[var(--color-ink)]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => void updateQuantity(item.id, 1).catch(() => undefined)}
                  disabled={loading}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="font-product text-sm text-[var(--color-muted)]">
                {formatPrice(item.unitPrice)} each
              </span>
            </div>

            <div className="text-right">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                Total
              </span>
              <span className="font-product text-lg font-bold text-[var(--color-primary)]">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="drawer-cart-item">
      <Link
        to={`/product/${item.productSlug}`}
        className="drawer-cart-item__image overflow-hidden rounded-image bg-surface"
        aria-label={`View ${item.productName}`}
      >
        {item.productImage ? (
          <StoreImage
            framing="square"
            src={item.productImage}
            alt={item.productName}
            width={192}
            height={192}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
        )}
      </Link>
      <div className="drawer-cart-item__details min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-1.5">
          <Link
            to={`/product/${item.productSlug}`}
            className="font-product leading-relaxed text-base font-semibold text-ink transition-colors hover:text-primary"
          >
            {item.productName}
          </Link>
          <button
            type="button"
            onClick={() => void removeFromCart(item.id).catch(() => undefined)}
            disabled={loading}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded p-0.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            aria-label={`Remove ${item.productName}`}
            title="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>

        {!item.inStock && <p className="text-sm text-danger">Unavailable</p>}
        <div className="font-product text-base text-primary">
          <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
          {item.quantity > 1 && (
            <p className="text-sm text-ink-soft">{formatPrice(item.unitPrice)} each</p>
          )}
        </div>
      </div>
      <div className="drawer-cart-item__quantity inline-flex w-fit items-center rounded-control border border-line bg-paper p-0.5">
        <button
          type="button"
          onClick={() => void updateQuantity(item.id, -1).catch(() => undefined)}
          disabled={loading}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="h-2.5 w-2.5" />
        </button>
        <span className="min-w-7 px-1 text-center text-base font-semibold text-ink">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => void updateQuantity(item.id, 1).catch(() => undefined)}
          disabled={loading}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-40"
          aria-label="Increase quantity"
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      </div>
    </article>
  )
}

export default CartItemRow
