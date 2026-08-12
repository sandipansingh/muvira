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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          {product.category.name}
        </span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.15] font-display">
        {product.name}
      </h1>

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-foreground">
          {formatPrice(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-base text-neutral-400 line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-0.5 rounded-full">
            {product.discountPercent}% OFF
          </span>
        )}
      </div>

      <p className="max-w-xl text-sm sm:text-base text-neutral-600 font-normal leading-relaxed">
        {product.description}
      </p>

      <div className="space-y-6 border-t border-border-light pt-6">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Quantity
          </span>
          <div className="flex items-center border border-border-light rounded-full overflow-hidden bg-neutral-50/60">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center text-sm font-bold text-foreground transition-colors hover:bg-neutral-100 cursor-pointer"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="flex h-10 w-10 items-center justify-center text-xs font-bold text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-10 w-10 items-center justify-center text-sm font-bold text-foreground transition-colors hover:bg-neutral-100 cursor-pointer"
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
            className="editorial-button min-h-12 flex-1 rounded-full text-sm font-bold"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add to Cart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWishlisted((prev) => !prev)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border border-border-light bg-white transition-all hover:bg-neutral-50 cursor-pointer ${
              isWishlisted ? 'text-red-500' : 'text-neutral-600'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <ul className="grid border-y border-border-light sm:grid-cols-3 py-1">
        <li className="flex items-center gap-2.5 border-b border-border-light py-3 sm:border-b-0 sm:border-r sm:pr-4">
          <ShieldCheck className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-700">15-year warranty</span>
        </li>
        <li className="flex items-center gap-2.5 border-b border-border-light py-3 sm:border-b-0 sm:px-4 sm:border-r">
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
