import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Eye } from 'lucide-react'
import type { ProductListItem, ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { RatingStars } from '../common/RatingStars'
import { useCart } from '../../context/CartContext'
import { QuickViewModal } from './QuickViewModal'

interface ProductCardProps {
  product: ProductListItem | ProductDetail
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const isDetail = 'images' in product
  const primaryImage = isDetail
    ? product.images[0]?.url
    : (product as ProductListItem).primaryImageUrl
  const categoryName = isDetail
    ? (product as ProductDetail).category.name
    : (product as ProductListItem).categoryName

  const hasDiscount = product.salePrice && product.salePrice < product.price

  return (
    <>
      <div className="group relative bg-[#F6F4EF] rounded-2xl p-3 border border-zinc-200/60 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
        {/* Product Image Container */}
        <div className="relative aspect-4/3 sm:aspect-square rounded-xl overflow-hidden bg-white mb-3">
          <Link to={`/product/${product.slug}`} className="block w-full h-full">
            <img
              src={
                primaryImage ||
                'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
              }
              alt={product.name}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.discountPercent > 0 && (
              <span className="px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                -{product.discountPercent}%
              </span>
            )}
          </div>

          {/* Wishlist Heart Button */}
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-xs z-10 ${
              isWishlisted
                ? 'bg-red-50 text-red-600'
                : 'bg-white/80 text-zinc-700 hover:bg-white hover:text-zinc-900'
            }`}
            aria-label="Add to wishlist"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-600' : ''}`} />
          </button>

          {/* Quick View Floating Action */}
          <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex gap-2">
            <button
              onClick={() => setIsQuickViewOpen(true)}
              className="flex-1 py-2 bg-white/95 hover:bg-white text-zinc-900 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Quick View
            </button>
          </div>
        </div>

        {/* Product Meta */}
        <div className="space-y-2 px-1 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#C88D35] uppercase tracking-wider">
              {categoryName}
            </span>
            <RatingStars
              rating={product.rating || 4.8}
              count={product.reviewCount || 12}
              size="sm"
            />
          </div>

          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-serif text-base font-bold text-zinc-900 group-hover:text-[#C88D35] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          {/* Price & Add to Cart button */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-200/60">
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-bold text-base text-zinc-900">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-zinc-400 line-through">
                  {formatPrice(product.salePrice!)}
                </span>
              )}
            </div>

            <button
              onClick={() => addToCart(product)}
              className="p-2 bg-zinc-900 hover:bg-[#C88D35] text-white rounded-lg transition-colors shadow-xs"
              aria-label="Add to cart"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}
