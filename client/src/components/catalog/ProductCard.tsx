import React, { useState } from 'react'
import { Eye, Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { RatingStars } from '../common/RatingStars'
import { QuickViewModal } from './QuickViewModal'

interface ProductCardProps {
  product: ProductListItem | ProductDetail
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const isDetail = 'images' in product
  const primaryImage = isDetail ? product.images[0]?.url : product.primaryImageUrl
  const categoryName = isDetail ? product.category.name : product.categoryName
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  return (
    <>
      <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
        <div>
          {/* Image Container with Off-White Background */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50/90 flex items-center justify-center p-3">
            <Link to={`/product/${product.slug}`} className="block h-full w-full">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-lg"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                  Image unavailable
                </div>
              )}
            </Link>

            {product.discountPercent > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                -{product.discountPercent}%
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:text-red-500"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
            </button>
          </div>

          {/* Product Details */}
          <div className="mt-3.5 px-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {categoryName}
              </span>
              {product.rating !== null && product.rating !== undefined && (
                <RatingStars rating={product.rating} count={product.reviewCount} size="sm" />
              )}
            </div>

            <Link to={`/product/${product.slug}`} className="block">
              <h3 className="font-semibold text-base leading-snug text-slate-900 line-clamp-1 transition-colors group-hover:text-slate-700">
                {product.name}
              </h3>
            </Link>
          </div>
        </div>

        {/* Footer Area: Price & Orange CTA Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
          <div>
            <span className="text-base font-bold text-slate-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="ml-1.5 text-xs text-slate-400 line-through">
                {formatPrice(product.salePrice!)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsQuickViewOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Quick view"
              title="Quick view"
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => addToCart(product)}
              className="flex items-center gap-1.5 rounded-xl bg-[#7e3d1c] px-3.5 py-2 text-xs font-semibold text-white shadow-xs shadow-[#7e3d1c]/20 transition-all hover:bg-[#693116] active:scale-95"
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </article>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}
