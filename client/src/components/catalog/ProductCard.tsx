import React, { useState } from 'react'
import { Check, Eye, Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { RatingStars } from '../common/RatingStars'
import { QuickViewModal } from './QuickViewModal'

interface ProductCardProps {
  product: ProductListItem | ProductDetail
  variant?: 'vertical' | 'horizontal'
  showDescription?: boolean
  className?: string
  badgeText?: string
}

const getPrimaryImage = (product: ProductListItem | ProductDetail) => {
  return 'images' in product ? product.images[0]?.url : product.primaryImageUrl
}

const getDescription = (product: ProductListItem | ProductDetail) => {
  if ('description' in product) return product.description
  return 'shortDescription' in product ? product.shortDescription : ''
}

const getDiscountPercent = (product: ProductListItem | ProductDetail) => {
  if (product.discountPercent > 0) return product.discountPercent
  if (!product.salePrice || product.salePrice <= product.price) return 0
  return Math.round(((product.salePrice - product.price) / product.salePrice) * 100)
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'vertical',
  showDescription = false,
  className = '',
  badgeText = 'NEW',
}) => {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const primaryImage = getPrimaryImage(product)
  const description = getDescription(product)
  const discountPercent = getDiscountPercent(product)
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  const handleWishlistToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsWishlisted((prev) => !prev)
    showToast(
      isWishlisted ? `Removed ${product.name} from wishlist` : `Added ${product.name} to wishlist`,
      'info'
    )
  }

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    addToCart(product)
    setIsAdded(true)
    showToast(`Added ${product.name} to your cart`, 'success')
    window.setTimeout(() => setIsAdded(false), 2000)
  }

  const handleOpenQuickView = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsQuickViewOpen(true)
  }

  /* List / Horizontal Variant */
  if (variant === 'horizontal') {
    return (
      <>
        <article
          className={`group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-card ${className}`}
        >
          {/* Image Area */}
          <div className="relative aspect-square w-full sm:w-56 bg-surface shrink-0 p-4 flex items-center justify-center overflow-hidden">
            <Link
              to={`/product/${product.slug}`}
              className="block h-full w-full flex items-center justify-center"
              aria-label={`View ${product.name}`}
            >
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="text-xs text-muted">Image unavailable</div>
              )}
            </Link>

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1.5 pointer-events-none">
              {badgeText && (
                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink shadow-xs">
                  {badgeText}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="rounded bg-[#38cb89] px-2 py-0.5 text-[10px] font-bold text-white">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-ink hover:scale-110 transition-transform cursor-pointer"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                className={`h-4 w-4 ${isWishlisted ? 'fill-danger text-danger' : 'text-ink'}`}
              />
            </button>
          </div>

          {/* Details Area */}
          <div className="flex flex-1 flex-col justify-between p-5">
            <div className="space-y-2">
              <RatingStars rating={product.rating ?? 5} size="xs" />
              <Link to={`/product/${product.slug}`} className="block">
                <h3 className="font-display text-lg font-normal text-ink group-hover:underline underline-offset-2">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-sans text-base font-semibold text-ink">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && product.salePrice && (
                  <span className="font-sans text-xs text-muted line-through">
                    {formatPrice(product.salePrice)}
                  </span>
                )}
              </div>
              {description && <p className="text-xs text-muted line-clamp-2">{description}</p>}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink hover:bg-black text-white px-4 py-2 text-xs font-normal transition-colors cursor-pointer"
              >
                {isAdded ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ShoppingBag className="h-3.5 w-3.5" />
                )}
                <span>{isAdded ? 'Added' : 'Add to cart'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenQuickView}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-white hover:bg-surface px-3 py-2 text-xs font-normal text-ink transition-colors cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-muted" />
                <span>Quick View</span>
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

  /* Vertical Card (Exact match to VisioCreate design reference) */
  return (
    <>
      <article className={`group flex flex-col ${className}`}>
        {/* Soft Surface Container for Image & Badges */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface p-4 flex flex-col justify-between transition-all duration-300 group-hover:shadow-card">
          {/* Top Badges & Heart Action */}
          <div className="z-10 flex items-start justify-between w-full pointer-events-none">
            <div className="flex flex-col gap-1.5">
              {badgeText && (
                <span className="rounded bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink shadow-xs pointer-events-auto">
                  {badgeText}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="rounded bg-[#38cb89] px-2 py-0.5 text-[11px] font-bold text-white pointer-events-auto">
                  -{discountPercent}%
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleWishlistToggle}
              className="pointer-events-auto h-8 w-8 rounded-full bg-white shadow-xs flex items-center justify-center text-ink hover:scale-110 transition-transform cursor-pointer"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                className={`h-4 w-4 ${isWishlisted ? 'fill-danger text-danger' : 'text-ink'}`}
              />
            </button>
          </div>

          {/* Centered Product Image */}
          <Link
            to={`/product/${product.slug}`}
            className="absolute inset-0 flex items-center justify-center p-6 z-0"
            aria-label={`View ${product.name}`}
          >
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="text-xs text-muted">Image unavailable</div>
            )}
          </Link>

          {/* Bottom Add to Cart CTA Button */}
          <div className="z-10 w-full pt-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink hover:bg-black text-white py-2.5 px-3 text-xs sm:text-sm font-normal shadow-sm transition-all duration-200 cursor-pointer"
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add to cart</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Product Information (Below Card) */}
        <div className="flex flex-col gap-1.5 pt-3 px-1">
          <RatingStars rating={product.rating ?? 5} size="xs" />

          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-display text-sm sm:text-base font-normal text-ink line-clamp-1 group-hover:underline underline-offset-2">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-baseline gap-2">
            <span className="font-sans text-sm sm:text-base font-semibold text-ink">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && product.salePrice && (
              <span className="font-sans text-xs text-muted line-through">
                {formatPrice(product.salePrice)}
              </span>
            )}
          </div>

          {showDescription && description && (
            <p className="text-xs text-muted line-clamp-2 mt-0.5">{description}</p>
          )}
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

export default ProductCard
