import React, { useState } from 'react'
import { Check, Eye, Heart, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { FavoriteButton } from '../common/FavoriteButton'
import { RatingStars } from '../common/RatingStars'
import { QuickViewModal } from './QuickViewModal'

interface ProductCardProps {
  product: ProductListItem | ProductDetail
  variant?: 'vertical' | 'horizontal'
  showDescription?: boolean
  className?: string
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'vertical',
  showDescription = false,
  className = '',
}) => {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const isDetail = 'images' in product
  const primaryImage = isDetail ? product.images[0]?.url : product.primaryImageUrl
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)
  const discountPercent =
    product.discountPercent > 0
      ? product.discountPercent
      : hasDiscount && product.salePrice
        ? Math.round(((product.salePrice - product.price) / product.salePrice) * 100)
        : 0

  const handleWishlistToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWishlisted((prev) => !prev)
    showToast(
      isWishlisted
        ? `Removed ${product.name} from wishlist`
        : `Added ${product.name} to wishlist`,
      'info'
    )
  }

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
    setIsAdded(true)
    showToast(`Added ${product.name} to your cart`, 'success')
    setTimeout(() => {
      setIsAdded(false), 2000
    })
  }

  const handleOpenQuickView = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsQuickViewOpen(true)
  }

  const description =
    'description' in product
      ? product.description
      : 'shortDescription' in product
        ? product.shortDescription
        : ''

  if (variant === 'horizontal') {
    return (
      <>
        <div
          className={`group relative flex flex-col sm:flex-row bg-white rounded-xl border border-neutral-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 ${className}`}
        >
          {/* Left Image Area */}
          <div className="relative w-full sm:w-1/2 aspect-[4/3] sm:aspect-auto bg-theme-card flex items-center justify-center p-4 overflow-hidden">
            <Link
              to={`/product/${product.slug}`}
              className="block w-full h-full flex items-center justify-center cursor-pointer"
              aria-label={`View ${product.name}`}
            >
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                  Image unavailable
                </div>
              )}
            </Link>

            {/* Badges */}
            <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-1.5 pointer-events-none">
              <span className="badge-new">NEW</span>
              {discountPercent > 0 && (
                <span className="badge-discount">-{discountPercent}%</span>
              )}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex flex-col justify-between p-5 sm:p-6 sm:w-1/2">
            <div className="space-y-2.5">
              <RatingStars rating={product.rating ?? 5} size="xs" />

              <Link to={`/product/${product.slug}`} className="block">
                <h3 className="font-semibold text-base sm:text-lg text-theme-dark group-hover:text-brand transition-colors line-clamp-1">
                  {product.name}
                </h3>
              </Link>

              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-base sm:text-lg text-theme-dark">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && product.salePrice && (
                  <span className="text-xs sm:text-sm text-theme-muted line-through">
                    {formatPrice(product.salePrice)}
                  </span>
                )}
              </div>

              {description && (
                <p className="text-xs sm:text-sm text-theme-muted leading-relaxed line-clamp-3">
                  {description}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-2.5 px-4 bg-theme-dark hover:bg-black text-white text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Added</span>
                  </>
                ) : (
                  <span>Add to cart</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleWishlistToggle}
                className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-theme-dark hover:text-brand transition-colors cursor-pointer py-1"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`}
                />
                <span>Wishlist</span>
              </button>
            </div>
          </div>
        </div>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      </>
    )
  }

  // Standard Vertical Card
  return (
    <>
      <div
        className={`group relative flex flex-col h-full bg-white transition-all duration-300 ${className}`}
      >
        {/* Soft Grey Image Container with Reference Styling */}
        <div className="relative w-full aspect-[3/4] sm:aspect-square bg-theme-card rounded-xl overflow-hidden flex items-center justify-center">
          {/* Clickable Image linking to Product Page */}
          <Link
            to={`/product/${product.slug}`}
            className="block w-full h-full cursor-pointer"
            aria-label={`View ${product.name}`}
          >
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-neutral-400">
                Image unavailable
              </div>
            )}
          </Link>

          {/* Top-Left Badges: NEW and Discount % */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
            <span className="badge-new">NEW</span>
            {discountPercent > 0 && (
              <span className="badge-discount">-{discountPercent}%</span>
            )}
          </div>

          {/* Top-Right Favorite / Wishlist Button */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteButton
              isFavorite={isWishlisted}
              onToggle={handleWishlistToggle}
              variant="solid"
              size="sm"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="bg-white/95 backdrop-blur-xs shadow-xs hover:shadow-sm"
            />
          </div>

          {/* Desktop Hover / Overlay "Add to Cart" Button */}
          <div className="absolute inset-x-3 bottom-3 z-20 hidden sm:flex flex-col gap-1.5 pointer-events-none">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`pointer-events-auto w-full py-2.5 px-4 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                isAdded
                  ? 'bg-theme-dark text-white'
                  : 'bg-theme-dark text-white hover:bg-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
              }`}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Added</span>
                </>
              ) : (
                <span>Add to cart</span>
              )}
            </button>
          </div>

          {/* Mobile Quick Action Pill on Image */}
          <div className="absolute bottom-2.5 right-2.5 z-20 flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs text-theme-dark flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
              aria-label={`Quick view ${product.name}`}
              title="Quick view"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-7 h-7 rounded-full bg-theme-dark text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
              aria-label={`Add ${product.name} to cart`}
              title="Add to cart"
            >
              {isAdded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Product Details Row Below Image */}
        <div className="pt-3 pb-1 flex flex-col gap-1">
          {/* Star Rating */}
          <RatingStars rating={product.rating ?? 5} size="xs" />

          {/* Product Title */}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-semibold text-sm sm:text-base text-theme-dark leading-snug line-clamp-1 group-hover:text-brand transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-semibold text-sm sm:text-base text-theme-dark">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && product.salePrice && (
              <span className="text-xs sm:text-sm text-theme-muted line-through font-normal">
                {formatPrice(product.salePrice)}
              </span>
            )}
          </div>

          {showDescription && description && (
            <p className="text-xs text-theme-muted line-clamp-2 mt-1">{description}</p>
          )}
        </div>
      </div>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}

export default ProductCard
