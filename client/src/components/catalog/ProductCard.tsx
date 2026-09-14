import React, { useState } from 'react'
import { Check, Eye, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
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
  badgeText,
}) => {
  const { addToCart } = useCart()
  const [isAdded, setIsAdded] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const primaryImage = getPrimaryImage(product)
  const description = getDescription(product)
  const discountPercent = getDiscountPercent(product)
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)

  const handleAddToCart = async (event?: React.SyntheticEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    try {
      await addToCart(product)
      setIsAdded(true)
      window.setTimeout(() => setIsAdded(false), 2000)
    } catch {
      setIsAdded(false)
    }
  }

  const handleOpenQuickView = (event?: React.SyntheticEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    setIsQuickViewOpen(true)
  }

  if (variant === 'horizontal') {
    return (
      <>
        <article
          className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-line bg-paper hover:shadow-card transition-all duration-300 w-full overflow-hidden ${className}`}
        >
          {/* Product Thumbnail */}
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-xl overflow-hidden bg-surface shrink-0">
            <Link
              to={`/product/${product.slug}`}
              className="block h-full w-full"
              aria-label={`View ${product.name}`}
            >
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  No image
                </div>
              )}
            </Link>
            <div className="absolute left-2 top-2 flex flex-col gap-1 pointer-events-none">
              {badgeText && (
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink shadow-xs">
                  {badgeText}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-1 flex-col justify-center gap-1.5 min-w-0 pr-2">
            {product.rating != null && (product.reviewCount ?? 0) > 0 && (
              <RatingStars rating={product.rating} count={product.reviewCount} size="xs" />
            )}
            <Link to={`/product/${product.slug}`} className="block">
              <h3 className="font-display text-base sm:text-lg text-ink group-hover:underline underline-offset-2 line-clamp-1">
                {product.name}
              </h3>
            </Link>
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-sm sm:text-base font-bold text-ink">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && product.salePrice && (
                <span className="font-sans text-xs text-muted line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted line-clamp-2 max-w-2xl">{description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
            <button
              type="button"
              onClick={handleAddToCart}
              className="button-primary min-h-9 px-4 text-xs gap-1.5 flex-1 sm:flex-initial"
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="leading-none">{isAdded ? 'Added' : 'Add to cart'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="button-secondary h-9 w-9 p-0 hidden sm:inline-flex"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye className="h-4 w-4 shrink-0 text-ink" strokeWidth={2} />
            </button>
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

  return (
    <>
      <article className={`product-card group ${className}`}>
        <div className="media-tile relative">
          <Link
            to={`/product/${product.slug}`}
            className="block h-full w-full"
            aria-label={`View ${product.name}`}
          >
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-muted)]">
                Image unavailable
              </div>
            )}
          </Link>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {badgeText && <span className="neutral-badge font-normal uppercase">{badgeText}</span>}
            {discountPercent > 0 && <span className="status-badge">-{discountPercent}%</span>}
          </div>
          <div className="absolute inset-x-3 bottom-3 z-10 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={handleAddToCart}
              className="button-primary min-h-10 flex-1 px-3 text-xs opacity-0 shadow-[var(--shadow-overlay)] transition-opacity duration-200 group-hover:opacity-100 gap-1.5"
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <ShoppingBag className="h-4 w-4 shrink-0" />
              )}
              <span className="leading-none">{isAdded ? 'Added' : 'Add to cart'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="button-secondary h-10 min-h-10 w-10 p-0 text-[var(--color-ink)] opacity-0 shadow-[var(--shadow-overlay)] transition-opacity duration-200 group-hover:opacity-100"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye className="h-4 w-4 shrink-0 text-[var(--color-ink)]" strokeWidth={2.5} />
            </button>
          </div>
          <div className="absolute bottom-3 right-3 z-10 flex gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="button-secondary h-9 min-h-9 w-9 p-0 text-[var(--color-ink)] shadow-[var(--shadow-overlay)]"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink)]" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="button-primary h-9 min-h-9 w-9 p-0"
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 pt-2.5">
          {product.rating != null && (product.reviewCount ?? 0) > 0 && (
            <RatingStars rating={product.rating} count={product.reviewCount} size="xs" />
          )}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="product-card__name line-clamp-2 group-hover:underline underline-offset-2">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-baseline gap-2">
            <span className="product-card__price">{formatPrice(product.price)}</span>
            {hasDiscount && product.salePrice && (
              <span className="product-card__meta line-through">
                {formatPrice(product.salePrice)}
              </span>
            )}
          </div>
          {showDescription && description && (
            <p className="product-card__meta line-clamp-2">{description}</p>
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
