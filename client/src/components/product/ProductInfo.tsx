import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { RatingStars } from '../common/RatingStars'
import { Button } from '../ui/Button'

interface ProductInfoProps {
  product: ProductDetail
  onReviewClick?: () => void
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product, onReviewClick }) => {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  const effectiveRating = product.rating ?? 4.7
  const totalReviews = product.reviewCount || 48

  const originalPrice =
    product.salePrice && product.salePrice > product.price
      ? product.salePrice
      : Math.round(product.price * 1.35)

  const savingsAmount = Math.max(0, originalPrice - product.price)
  const discountPercent =
    product.discountPercent ||
    (originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0)

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await addToCart(product, quantity)
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = async () => {
    setIsBuyingNow(true)
    try {
      await addToCart(product, quantity)
      navigate('/checkout')
    } finally {
      setIsBuyingNow(false)
    }
  }

  return (
    <div className="flex flex-col space-y-5 pr-0 sm:pr-2 lg:pr-8 xl:pr-12">
      {/* Product Title */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-normal leading-tight text-ink sm:text-3xl lg:text-[2rem]">
          {product.name}
        </h1>

        {/* Rating and Social Proof Header */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-normal text-muted sm:gap-3">
          <div className="flex items-center gap-1.5">
            <RatingStars rating={effectiveRating} size="sm" />
            <span className="font-normal text-ink">{effectiveRating.toFixed(1)}</span>
          </div>

          <span className="text-line">•</span>

          <button
            type="button"
            onClick={onReviewClick}
            className="cursor-pointer font-normal text-muted transition-colors hover:text-primary hover:underline"
            aria-label="View customer reviews"
          >
            ({totalReviews} Reviews)
          </button>
        </div>
      </div>

      {/* Short Editorial Lead Description */}
      <p className="text-sm leading-relaxed text-ink-soft/90">
        {product.shortDescription ||
          product.description ||
          'Masterfully handcrafted by artisan communities in Rajasthan using solid seasoned timber and natural hand-rubbed organic finishes.'}
      </p>

      {/* Price Section with Savings Pill */}
      <div className="flex flex-wrap items-baseline gap-3 border-y border-line/70 py-3.5">
        <span className="font-display text-2xl font-normal text-ink sm:text-3xl">
          {formatPrice(product.price)}
        </span>
        {originalPrice > product.price && (
          <>
            <span className="text-base font-normal text-muted line-through">
              {formatPrice(originalPrice)}
            </span>
            <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-normal text-primary">
              Save {formatPrice(savingsAmount)} ({discountPercent}% OFF)
            </span>
          </>
        )}
      </div>

      {/* Quantity Selector, Buy Now & Add to Cart Controls (Divided into 2 Rows) */}
      <div className="space-y-3 pt-2">
        {/* Row 1: Stepper, Add to Cart & Wishlist */}
        <div className="flex items-center gap-2.5">
          {/* Quantity Stepper */}
          <div className="flex h-11 items-center rounded-[var(--radius-control)] border border-line bg-surface px-1.5">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-base font-normal text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-normal text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-base font-normal text-ink transition-colors hover:bg-white"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Secondary Add to Cart Button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            isLoading={isAdding}
            onClick={handleAddToCart}
            leftIcon={<ShoppingBag className="h-4 w-4 shrink-0" />}
            className="flex-1 font-medium"
          >
            Add to Cart
          </Button>

          {/* Wishlist Heart Icon Button */}
          <button
            type="button"
            onClick={() => setIsWishlisted((prev) => !prev)}
            className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border transition-all ${
              isWishlisted
                ? 'border-danger/40 bg-danger-soft text-danger'
                : 'border-line bg-white text-ink hover:border-field-border hover:bg-surface'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`h-4.5 w-4.5 ${
                isWishlisted ? 'fill-danger text-danger' : 'text-ink-soft'
              }`}
            />
          </button>
        </div>

        {/* Row 2: Full-Width Primary Buy Now Button */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={isBuyingNow}
          onClick={handleBuyNow}
          className="w-full font-medium"
        >
          Buy Now
        </Button>
      </div>
    </div>
  )
}

export default ProductInfo
