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
    <article className="flex items-center gap-4 border-b border-line pb-4">
      <Link
        to={`/product/${item.productSlug}`}
        className="h-20 w-20 shrink-0 overflow-hidden bg-surface"
        aria-label={`View ${item.productName}`}
      >
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-ink">
            No image
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${item.productSlug}`}
          className="block truncate font-serif text-sm font-bold text-ink transition-colors duration-control hover:text-terracotta"
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-xs font-semibold text-ink">{formatPrice(item.unitPrice)}</p>
        <div className="mt-3 flex items-center border border-line">
          <button
            type="button"
            onClick={() => updateQuantity(item.productId, -1)}
            className="px-2.5 py-1 text-xs font-bold text-ink transition-colors duration-control hover:bg-surface"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="border-x border-line px-3 py-1 text-xs font-bold text-ink">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(item.productId, 1)}
            className="px-2.5 py-1 text-xs font-bold text-ink transition-colors duration-control hover:bg-surface"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => removeFromCart(item.productId)}
        className="p-1.5 text-muted-ink transition-colors hover:text-danger"
        aria-label={`Remove ${item.productName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  )
}
