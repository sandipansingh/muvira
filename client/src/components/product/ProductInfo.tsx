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
    <div className="space-y-space-6">
      <div className="flex items-start justify-between gap-space-4">
        <span className="editorial-label">{product.category.name}</span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      <h1 className="editorial-heading text-display-l-mobile sm:text-display-l-desktop">
        {product.name}
      </h1>

      <div className="flex flex-wrap items-baseline gap-space-3">
        <span className="text-heading-m-mobile font-semibold text-terracotta sm:text-heading-m-desktop">
          {formatPrice(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-body text-muted line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="text-ui font-semibold text-muted">{product.discountPercent}% off</span>
        )}
      </div>

      <p className="max-w-xl text-body text-ink">{product.description}</p>

      <div className="space-y-space-6 border-t border-rule pt-space-6">
        <div className="flex items-center gap-space-4">
          <span className="text-ui font-semibold text-ink">Quantity</span>
          <div className="flex items-center border border-rule">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex min-h-11 min-w-11 items-center justify-center text-body font-semibold text-ink transition-colors duration-control hover:bg-surface"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex min-h-11 min-w-11 items-center justify-center border-x border-rule text-ui font-semibold text-ink">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex min-h-11 min-w-11 items-center justify-center text-body font-semibold text-ink transition-colors duration-control hover:bg-surface"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-space-3">
          <button
            type="button"
            onClick={() => addToCart(product, quantity)}
            className="editorial-button min-h-11 flex-1"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add to cart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-control border border-rule bg-paper transition-colors duration-control hover:border-ink ${
              isWishlisted ? 'text-ink' : 'text-muted'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <ul className="grid border-y border-rule sm:grid-cols-3">
        <li className="flex items-center gap-space-2 border-b border-rule py-space-3 sm:border-b-0 sm:border-r sm:pr-space-4">
          <ShieldCheck className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
          <span className="text-ui text-ink">15-year warranty</span>
        </li>
        <li className="flex items-center gap-space-2 border-b border-rule py-space-3 sm:border-b-0 sm:px-space-4 sm:border-r">
          <Truck className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
          <span className="text-ui text-ink">Free door delivery</span>
        </li>
        <li className="flex items-center gap-space-2 py-space-3 sm:pl-space-4">
          <RotateCcw className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
          <span className="text-ui text-ink">30-day easy returns</span>
        </li>
      </ul>
    </div>
  )
}
