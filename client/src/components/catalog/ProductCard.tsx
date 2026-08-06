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
  const hasDiscount = product.salePrice && product.salePrice > product.price

  return (
    <>
      <article className="group border-b border-line bg-paper pb-4">
        <div className="relative aspect-[4/3] overflow-hidden bg-ivory sm:aspect-square">
          <Link to={`/product/${product.slug}`} className="block h-full w-full">
            {primaryImage ? (
              <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-ink">
                Image unavailable
              </div>
            )}
          </Link>
          {product.discountPercent > 0 && (
            <span className="absolute left-3 top-3 bg-cognac-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
              -{product.discountPercent}%
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
            className="absolute right-3 top-3 bg-paper/90 p-2 text-ink transition-colors hover:text-cognac"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-cognac' : ''}`} />
          </button>
        </div>

        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="editorial-label text-[10px]">{categoryName}</p>
              <Link to={`/product/${product.slug}`} className="mt-1 block">
                <h3 className="font-serif text-lg font-bold leading-tight text-ink transition-colors group-hover:text-cognac">
                  {product.name}
                </h3>
              </Link>
            </div>
            {product.rating !== null && product.rating !== undefined && (
              <RatingStars rating={product.rating} count={product.reviewCount} size="sm" />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-ink">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="text-xs text-muted-ink line-through">
                  {formatPrice(product.salePrice!)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsQuickViewOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-ink transition-colors hover:text-cognac"
              >
                <Eye className="h-3.5 w-3.5" /> Quick view
              </button>
              <button
                type="button"
                onClick={() => addToCart(product)}
                className="bg-ink p-2 text-paper transition-colors hover:bg-cognac"
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            </div>
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
