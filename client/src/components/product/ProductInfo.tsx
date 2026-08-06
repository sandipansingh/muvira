import React, { useState } from 'react'
import { ShoppingBag, ShieldCheck, Truck, RotateCcw, Heart } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'
import { useCart } from '../../context/CartContext'

interface ProductInfoProps {
  product: ProductDetail
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)

  const hasDiscount = product.salePrice && product.salePrice < product.price

  return (
    <div className="space-y-6">
      {/* Category & Stock */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#C88D35]">
          {product.category.name}
        </span>
        <StockBadge quantity={product.stock} isAvailable={product.inStock} />
      </div>

      {/* Product Title */}
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 leading-tight">
        {product.name}
      </h1>

      {/* Rating & Reviews */}
      <div className="flex items-center gap-4">
        <RatingStars rating={product.rating || 4.8} count={product.reviewCount || 12} size="md" />
        <span className="text-xs text-zinc-400">|</span>
        <span className="text-xs text-zinc-500 font-medium">FSC-Certified Solid Timber</span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-4 py-2 border-y border-zinc-200/80">
        <span className="font-sans text-3xl font-bold text-zinc-900">
          {formatPrice(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-lg text-zinc-400 line-through font-medium">
            {formatPrice(product.salePrice!)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
            -{product.discountPercent}%
          </span>
        )}
      </div>

      {/* Short Description */}
      <p className="text-sm text-zinc-600 leading-relaxed font-light">{product.description}</p>

      {/* Quantity & Actions */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-zinc-700">Quantity</span>
          <div className="flex items-center border border-zinc-300 rounded-xl overflow-hidden bg-[#F6F4EF]">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-2 text-zinc-700 hover:bg-zinc-200 font-bold"
            >
              -
            </button>
            <span className="px-5 py-2 text-sm font-bold text-zinc-900">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-4 py-2 text-zinc-700 hover:bg-zinc-200 font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => addToCart(product, quantity)}
            className="flex-1 py-4 bg-zinc-900 hover:bg-[#C88D35] text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <ShoppingBag className="w-4 h-4" /> Add to Cart
          </button>
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={`p-4 rounded-full border border-zinc-300 transition-colors flex items-center justify-center ${
              isWishlisted ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white hover:bg-zinc-50'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-600' : 'text-zinc-700'}`} />
          </button>
        </div>
      </div>

      {/* Feature Bullet Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-200 text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#C88D35]" />
          <span>15-Yr Warranty</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#C88D35]" />
          <span>White-Glove Delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#C88D35]" />
          <span>30-Day Returns</span>
        </div>
      </div>
    </div>
  )
}
