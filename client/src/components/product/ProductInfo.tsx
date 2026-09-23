import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [isFooterVisible, setIsFooterVisible] = useState(false)

  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting))
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

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
        <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight text-ink">
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
        <p className="text-base leading-relaxed text-ink-soft/90">
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
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quantity Stepper */}
          <div className="flex min-h-[var(--tap-target)] items-center rounded-[var(--radius-control)] border border-line bg-surface">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded text-base font-normal text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-8 text-center text-base font-normal text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded text-base font-normal text-ink transition-colors hover:bg-white"
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
            className="min-w-[9rem] flex-1 font-bold"
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
      {!isFooterVisible &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-[var(--z-header)] grid grid-cols-2 gap-2 border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-overlay)] sm:hidden">
            <Button
              variant="secondary"
              size="lg"
              isLoading={isAdding}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="min-w-0 px-2 text-sm"
            >
              Add to Cart
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isBuyingNow}
              onClick={handleBuyNow}
              disabled={!product.inStock}
              className="min-w-0 px-2 text-sm"
            >
              Buy Now
            </Button>
          </div>,
          document.body
        )}
    </div>
  )
}

export default ProductInfo
