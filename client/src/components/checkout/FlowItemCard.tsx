import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, X, ChevronDown } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

export interface FlowItemCardProps {
  item: CartItem
  showQuantityPicker?: boolean
}

export const FlowItemCard: React.FC<FlowItemCardProps> = ({ item, showQuantityPicker = true }) => {
  const { updateQuantity, removeFromCart, loading } = useCart()
  const [isLiked, setIsLiked] = useState(false)
  const [isQtyMenuOpen, setIsQtyMenuOpen] = useState(false)

  const handleQtySelect = async (qty: number) => {
    setIsQtyMenuOpen(false)
    const delta = qty - item.quantity
    if (delta !== 0) {
      try {
        await updateQuantity(item.productId, delta)
      } catch {
        // Cart context presents the server error.
      }
    }
  }

  return (
    <article className="relative flex items-start gap-3.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3.5 sm:gap-4 sm:p-4 shadow-xs transition-all hover:border-[var(--color-field-border)]">
      {/* Product Image with Heart badge */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] sm:h-24 sm:w-24">
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
            No image
          </div>
        )}

        {/* Favorite heart overlay on top corner */}
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          aria-label={isLiked ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-all ${
            isLiked
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'bg-white/80 text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Item count marker on bottom left */}
        <span className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-ink)]/70 text-[9px] font-bold text-white">
          {item.quantity}
        </span>
      </div>

      {/* Item Details */}
      <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch pr-6">
        <div>
          <Link
            to={`/product/${item.productSlug}`}
            className="line-clamp-1 font-display text-sm font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors sm:text-base"
          >
            {item.productName}
          </Link>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Handcrafted Art &bull; <span className="text-accent font-medium">In Stock</span>
          </p>
        </div>

        {/* Variant & Quantity Pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[var(--color-ink-soft)]">
            Handmade Edition
          </span>

          {showQuantityPicker && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsQtyMenuOpen(!isQtyMenuOpen)}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-field-border)] transition-colors disabled:opacity-50"
              >
                <span>Qty {item.quantity}</span>
                <ChevronDown className="h-3 w-3 text-[var(--color-muted)]" />
              </button>

              {isQtyMenuOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-36 w-20 overflow-y-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-1 shadow-lg">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQtySelect(num)}
                      className={`flex w-full cursor-pointer items-center justify-center rounded px-2 py-1 text-xs transition-colors ${
                        item.quantity === num
                          ? 'bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]'
                          : 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete [X] Button on Top Right */}
      <button
        type="button"
        onClick={() => void removeFromCart(item.productId).catch(() => undefined)}
        disabled={loading}
        aria-label={`Remove ${item.productName}`}
        className="absolute right-3 top-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] transition-all hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5 stroke-[2.5]" />
      </button>

      {/* Price Aligned at Bottom Right */}
      <div className="absolute bottom-3 right-3 text-right">
        <span className="font-sans text-sm font-bold text-[var(--color-ink)] sm:text-base">
          {formatPrice(item.lineTotal)}
        </span>
      </div>
    </article>
  )
}

export default FlowItemCard
