import React from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { CartItem } from '../../lib/types/cart'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'

interface CartItemRowProps {
  item: CartItem
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart()
  return (
    <article className="flex items-center gap-4 border-b border-[var(--kit-line)] pb-4">
      <Link
        to={`/product/${item.productSlug}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-surface)]"
        aria-label={`View ${item.productName}`}
      >
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            No image
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${item.productSlug}`}
          className="block truncate font-display text-sm font-bold text-[var(--kit-ink)] transition-colors hover:text-[var(--kit-muted)]"
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-xs font-bold text-[var(--kit-ink)]">
          {formatPrice(item.unitPrice)}
        </p>
        <div className="mt-2.5 inline-flex items-center border border-border-light rounded-full overflow-hidden bg-neutral-50/60">
          <button
            type="button"
            onClick={() => updateQuantity(item.productId, -1)}
            className="px-3 py-1 text-xs font-bold text-foreground transition-colors hover:bg-neutral-100 cursor-pointer"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="border-x border-border-light px-3 py-1 text-xs font-bold text-foreground">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(item.productId, 1)}
            className="px-3 py-1 text-xs font-bold text-foreground transition-colors hover:bg-neutral-100 cursor-pointer"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => removeFromCart(item.productId)}
        className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 cursor-pointer"
        aria-label={`Remove ${item.productName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  )
}

export default CartItemRow
