import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
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
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  const originalPrice =
    product.salePrice && product.salePrice > product.price ? product.salePrice : null

  const savingsAmount = originalPrice ? originalPrice - product.price : 0
  const discountPercent =
    product.discountPercent ||
    (originalPrice && originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0)

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await addToCart(product, quantity)
    } catch {
      // Cart context presents the server error.
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = async () => {
    setIsBuyingNow(true)
    try {
      await addToCart(product, quantity)
      navigate('/checkout')
    } catch {
      // Cart context presents the server error and checkout remains closed.
    } finally {
      setIsBuyingNow(false)
    }
  }

  return (
    <div className="flex flex-col space-y-5 pr-0 sm:pr-2 lg:pr-8 xl:pr-12">
      {/* Product Title */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-[2rem]">
          {product.name}
        </h1>

        {product.rating != null && (product.reviewCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={onReviewClick}
            className="flex cursor-pointer items-center gap-2 text-xs text-muted transition-colors hover:text-primary hover:underline"
            aria-label="View customer reviews"
          >
            <RatingStars rating={product.rating} size="sm" />
            <span>{product.rating.toFixed(1)}</span>
            <span>
              ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </button>
        )}
      </div>

      {/* Short Editorial Lead Description */}
      {(product.shortDescription || product.description) && (
        <p className="text-sm leading-relaxed text-ink-soft/90">
          {product.shortDescription || product.description}
        </p>
      )}

      {/* Price Section with Savings Pill */}
      <div className="flex flex-wrap items-baseline gap-3 py-1.5">
        <span className="font-sans text-2xl font-bold text-ink sm:text-3xl">
          {formatPrice(product.price)}
        </span>
        {originalPrice && originalPrice > product.price && (
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
        {/* Row 1: Stepper and Add to Cart */}
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
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
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
            disabled={!product.inStock}
            leftIcon={<ShoppingBag className="h-4 w-4 shrink-0" />}
            className="flex-1 font-bold"
          >
            {product.inStock ? 'Add to Cart' : 'Unavailable'}
          </Button>
        </div>

        {/* Row 2: Full-Width Primary Buy Now Button */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={isBuyingNow}
          onClick={handleBuyNow}
          disabled={!product.inStock}
          className="w-full font-bold"
        >
          {product.inStock ? 'Buy Now' : 'Unavailable'}
        </Button>
      </div>
    </div>
  )
}

export default ProductInfo
