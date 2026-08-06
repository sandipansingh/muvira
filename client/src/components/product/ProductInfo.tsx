import React, { useState } from 'react'
import { Heart, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'

interface ProductInfoProps {
  product: ProductDetail
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const hasDiscount = product.salePrice && product.salePrice > product.price

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <span className="editorial-label">{product.category.name}</span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      <h1 className="editorial-heading text-4xl leading-[0.95] sm:text-5xl">{product.name}</h1>

      <div className="flex flex-wrap items-center gap-4">
        {product.rating !== null && product.rating !== undefined ? (
          <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
        ) : (
          <span className="text-xs text-muted-ink">No reviews yet</span>
        )}
        <span className="text-xs text-line">|</span>
        <span className="text-xs font-medium text-muted-ink">FSC-certified solid timber</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-4 border-y border-line py-5">
        <span className="text-3xl font-semibold text-ink">{formatPrice(product.price)}</span>
        {hasDiscount && (
          <span className="text-lg text-muted-ink line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="bg-cognac-soft px-2 py-1 text-xs font-semibold text-ink">
            -{product.discountPercent}%
          </span>
        )}
      </div>

      <p className="text-sm leading-7 text-muted-ink">{product.description}</p>

      <div className="space-y-4 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-ink">Quantity</span>
          <div className="flex items-center border border-line">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-2 text-ink hover:bg-ivory"
            >
              −
            </button>
            <span className="min-w-12 border-x border-line px-4 py-2 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="px-4 py-2 text-ink hover:bg-ivory"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => addToCart(product, quantity)}
            className="editorial-button flex-1"
          >
            <ShoppingBag className="h-4 w-4" /> Add to cart
          </button>
          <button
            type="button"
            onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
            className={`border border-line p-3 transition-colors hover:border-cognac ${isWishlisted ? 'text-cognac' : 'text-ink'}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line pb-6 text-xs text-muted-ink sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cognac" /> 15-yr warranty
        </div>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-cognac" /> White-glove delivery
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-cognac" /> 30-day returns
        </div>
      </div>
    </div>
  )
}
