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
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {product.category.name}
        </span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      <h1 className="font-serif text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
        {product.name}
      </h1>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        {product.rating !== null && product.rating !== undefined ? (
          <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
        ) : (
          <span className="text-slate-400">No reviews yet</span>
        )}
        <span className="text-slate-300">•</span>
        <span className="text-slate-600">Handcrafted Premium Finish</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
        <span className="text-3xl font-extrabold text-slate-900">{formatPrice(product.price)}</span>
        {hasDiscount && (
          <span className="text-lg text-slate-400 line-through">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            -{product.discountPercent}% OFF
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>

      <div className="space-y-5 border-t border-slate-200/80 pt-6">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Quantity
          </span>
          <div className="flex items-center rounded-full border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-white hover:shadow-xs transition-all font-bold"
            >
              −
            </button>
            <span className="min-w-10 text-center text-sm font-bold text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-white hover:shadow-xs transition-all font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => addToCart(product, quantity)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-4 text-sm font-bold text-white shadow-md shadow-orange-600/25 transition-all hover:bg-orange-700 active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Add to cart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
            className={`rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 shadow-xs ${
              isWishlisted ? 'text-red-500 border-red-200' : 'text-slate-700'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feature cards with off-white backgrounds */}
      <div className="grid gap-3 pt-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
          <ShieldCheck className="h-5 w-5 text-slate-800 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">15-Year Warranty</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
          <Truck className="h-5 w-5 text-slate-800 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">Free Door Delivery</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
          <RotateCcw className="h-5 w-5 text-slate-800 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">30-Day Easy Returns</span>
        </div>
      </div>
    </div>
  )
}
