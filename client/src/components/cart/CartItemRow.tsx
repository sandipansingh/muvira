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
    <div className="flex gap-4 p-4 bg-[#F6F4EF] rounded-2xl border border-zinc-200/80 items-center justify-between">
      {/* Image */}
      <Link
        to={`/product/${item.productSlug}`}
        className="w-20 h-20 rounded-xl overflow-hidden bg-white shrink-0 border border-zinc-200"
      >
        <img
          src={item.productImage || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc'}
          alt={item.productName}
          className="w-full h-full object-cover"
        />
      </Link>

      {/* Title & Price */}
      <div className="flex-1 min-w-0 space-y-1">
        <Link
          to={`/product/${item.productSlug}`}
          className="font-serif font-bold text-sm text-zinc-900 hover:text-[#C88D35] transition-colors truncate block"
        >
          {item.productName}
        </Link>
        <div className="text-xs font-semibold text-zinc-900">{formatPrice(item.unitPrice)}</div>
      </div>

      {/* Quantity Adjuster & Remove */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => updateQuantity(item.productId, -1)}
            className="px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 font-bold"
          >
            -
          </button>
          <span className="px-3 py-1 text-xs font-bold text-zinc-900">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.productId, 1)}
            className="px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 font-bold"
          >
            +
          </button>
        </div>

        <button
          onClick={() => removeFromCart(item.productId)}
          className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
