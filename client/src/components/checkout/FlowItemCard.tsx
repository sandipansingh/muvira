import { StoreImage } from '../common/StoreImage'
import React from 'react'
import { Dropdown } from '../ui/Dropdown'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

export interface FlowItemCardProps {
  item: CartItem
  showQuantityPicker?: boolean
}

export const FlowItemCard: React.FC<FlowItemCardProps> = ({ item, showQuantityPicker = true }) => {
  const { updateQuantity, removeFromCart, loading } = useCart()

  const handleQtySelect = async (qty: number) => {
    const delta = qty - item.quantity
    if (delta !== 0) {
      try {
        await updateQuantity(item.id, delta)
      } catch {
        // Cart context presents the server error.
      }
    }
  }

  return (
    <article className="commerce-item cart-product-row">
      {/* Product image */}
      <div className="commerce-item__image cart-product-image relative shrink-0 overflow-hidden rounded-image bg-surface">
        {item.productImage ? (
          <StoreImage
            src={item.productImage}
            alt={item.productName}
            width={320}
            height={320}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
            No image
          </div>
        )}

        {/* Item count marker on bottom left */}
        <span className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-ink)]/70 text-[9px] font-bold text-white">
          {item.quantity}
        </span>
      </div>

      {/* Item Details */}
      <div className="flex min-w-0 flex-[1_1_8rem] flex-col justify-between self-stretch">
        <div>
          <Link
            to={`/product/${item.productSlug}`}
            className="block min-h-[var(--tap-target)] break-words pr-10 font-product leading-[1.15] tracking-tight text-base font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
          >
            <span>{item.productName}</span>
          </Link>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {item.inStock ? `${item.availableStock} available` : 'Currently unavailable'}
          </p>
        </div>

        {/* Variant & Quantity Pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {showQuantityPicker && (
            <Dropdown
              value={String(item.quantity)}
              onChange={(value) => void handleQtySelect(Number(value))}
              disabled={loading || item.availableStock < 1}
              aria-label={`Quantity for ${item.productName}`}
              variant="slim"
              className="w-28"
              options={Array.from(
                new Set([
                  item.quantity,
                  ...Array.from(
                    { length: Math.min(10, item.availableStock) },
                    (_, index) => index + 1
                  ),
                ])
              )
                .sort((a, b) => a - b)
                .map((quantity) => ({ value: String(quantity), label: `Qty ${quantity}` }))}
            />
          )}
        </div>
        <p className="mt-2 text-sm text-ink-soft">{formatPrice(item.unitPrice)} each</p>
        <span className="mt-2 block font-product text-base font-bold text-[var(--color-ink)]">
          {formatPrice(item.lineTotal)}
        </span>
      </div>

      {/* Delete [X] Button on Top Right */}
      <button
        type="button"
        onClick={() => void removeFromCart(item.id).catch(() => undefined)}
        disabled={loading}
        aria-label={`Remove ${item.productName}`}
        className="cart-product-remove absolute right-0 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-control text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5 stroke-[2.5]" />
      </button>
    </article>
  )
}

export default FlowItemCard
