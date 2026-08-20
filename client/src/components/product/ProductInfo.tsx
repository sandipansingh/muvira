import React, { useState } from 'react'
import { Heart, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { StockBadge } from '../common/StockBadge'

interface ProductInfoProps {
  product: ProductDetail
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <span className="kit-eyebrow">{product.category.name}</span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      <h1 className="kit-heading text-3xl sm:text-5xl">{product.name}</h1>

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-2xl font-bold text-[var(--kit-ink)] sm:text-3xl">
          {formatPrice(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-base text-neutral-400 line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="kit-status-badge">{product.discountPercent}% OFF</span>
        )}
      </div>

      <p className="kit-body-copy max-w-xl text-base">{product.description}</p>

      <div className="space-y-6 border-t border-[var(--kit-line)] pt-6">
        <div className="flex items-center gap-4">
          <span className="kit-eyebrow">Quantity</span>
          <div className="flex items-center overflow-hidden rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-surface)]">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-sm font-bold text-[var(--kit-ink)] transition-colors hover:bg-[var(--kit-line)]"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-11 w-10 items-center justify-center text-sm font-semibold text-[var(--kit-ink)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-sm font-bold text-[var(--kit-ink)] transition-colors hover:bg-[var(--kit-line)]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => addToCart(product, quantity)}
            className="kit-button min-h-12 flex-1 text-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add to Cart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWishlisted((prev) => !prev)}
            className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-[var(--kit-radius-control)] border border-[var(--kit-line)] bg-[var(--kit-paper)] transition-colors hover:bg-[var(--kit-surface)] ${
              isWishlisted ? 'text-red-500' : 'text-neutral-600'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <ul className="grid border-y border-[var(--kit-line)] py-1 sm:grid-cols-3">
        <li className="flex items-center gap-2.5 border-b border-[var(--kit-line)] py-3 sm:border-b-0 sm:border-r sm:pr-4">
          <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-700">15-year warranty</span>
        </li>
        <li className="flex items-center gap-2.5 border-b border-[var(--kit-line)] py-3 sm:border-b-0 sm:border-r sm:px-4">
          <Truck className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-700">Free door delivery</span>
        </li>
        <li className="flex items-center gap-2.5 py-3 sm:pl-4">
          <RotateCcw className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-700">30-day returns</span>
        </li>
      </ul>
    </div>
  )
}

export default ProductInfo
