import React, { useState } from 'react'
import { Eye, Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
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
      <article className="group flex h-full flex-col overflow-hidden rounded-image border border-rule bg-paper">
        <div className="relative aspect-square bg-surface">
          <Link to={`/product/${product.slug}`} className="block h-full w-full">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-control group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-ui text-muted">
                Image unavailable
              </div>
            )}
          </Link>

          {product.discountPercent > 0 && (
            <span className="absolute left-3 top-3 border border-rule bg-paper px-2 py-1 text-eyebrow-mobile font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-ink md:text-eyebrow-desktop">
              {product.discountPercent}% off
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsWishlisted((wishlisted) => !wishlisted)}
            className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-control border border-rule bg-paper text-ink transition-colors duration-control hover:border-ink"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <span className="text-eyebrow-mobile font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-muted md:text-eyebrow-desktop">
            {categoryName}
          </span>

          <Link to={`/product/${product.slug}`} className="mt-2 block">
            <h3 className="line-clamp-2 text-body font-semibold text-ink transition-colors duration-control group-hover:text-terracotta">
              {product.name}
            </h3>
          </Link>

          <div className="mt-auto flex flex-col items-start gap-3 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-ui font-semibold text-ink">
              <span>{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="ml-2 text-muted line-through">
                  {formatPrice(product.salePrice!)}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickViewOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-control text-muted transition-colors duration-control hover:text-ink"
                aria-label={`Quick view ${product.name}`}
                title="Quick view"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => addToCart(product)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-terracotta px-3 text-ui font-semibold text-paper transition-colors duration-control hover:bg-terracotta-hover"
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Add</span>
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
