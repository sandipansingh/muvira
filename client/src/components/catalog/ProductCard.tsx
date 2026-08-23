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
    setIsWishlisted((previous) => !previous)
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

  if (variant === 'horizontal') {
    return (
      <>
        <article className={`panel group flex flex-col overflow-hidden sm:flex-row ${className}`}>
          <div className="relative aspect-[4/3] w-full bg-[var(--color-surface)] sm:w-1/2">
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
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted)]">
                  Image unavailable
                </div>
              )}
            </Link>
            <div className="absolute left-3 top-3 flex flex-col gap-1.5">
              {badgeText !== '' && (
                <span className="neutral-badge font-bold uppercase">{badgeText ?? 'NEW'}</span>
              )}
              {discountPercent > 0 && <span className="status-badge">-{discountPercent}%</span>}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <div className="space-y-2.5">
              <RatingStars rating={product.rating ?? 5} size="xs" />
              <Link to={`/product/${product.slug}`} className="block">
                <h3 className="product-card__name text-base sm:text-lg">{product.name}</h3>
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="product-card__price text-base sm:text-lg">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && product.salePrice && (
                  <span className="product-card__meta line-through">
                    {formatPrice(product.salePrice)}
                  </span>
                )}
              </div>
              {description && <p className="body-copy line-clamp-3 text-sm">{description}</p>}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="button-primary flex-1 text-xs"
              >
                {isAdded ? <Check className="h-4 w-4 shrink-0" /> : null}
                <span className="leading-none">{isAdded ? 'Added' : 'Add to cart'}</span>
              </button>
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="button-secondary h-11 min-h-11 w-11 p-0"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
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
            {badgeText !== '' && (
              <span className="neutral-badge font-bold uppercase">{badgeText ?? 'NEW'}</span>
            )}
            {discountPercent > 0 && <span className="status-badge">-{discountPercent}%</span>}
          </div>
          <div className="absolute right-3 top-3">
            <FavoriteButton
              isFavorite={isWishlisted}
              onToggle={handleWishlistToggle}
              variant="solid"
              size="sm"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="border border-[var(--color-line)] bg-[var(--color-paper)] shadow-none"
            />
          </div>
          <div className="absolute inset-x-3 bottom-3 z-10 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={handleAddToCart}
              className="button-primary min-h-10 flex-1 px-3 text-xs opacity-0 shadow-[var(--shadow-overlay)] transition-opacity duration-200 group-hover:opacity-100"
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? <Check className="h-4 w-4 shrink-0" /> : null}
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
          <div className="absolute bottom-3 right-3 flex gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="button-secondary h-9 min-h-9 w-9 border-[var(--color-ink)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-overlay)]"
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
              {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 pt-3">
          <RatingStars rating={product.rating ?? 5} size="xs" />
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="product-card__name line-clamp-2">{product.name}</h3>
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
