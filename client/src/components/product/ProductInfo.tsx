import React, { useEffect, useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { Button } from '../ui/Button'

interface ProductInfoProps {
  product: ProductDetail
  onReviewClick?: () => void
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)

  /* Simulated real-time offer countdown timer */
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 12,
    minutes: 45,
    seconds: 5,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        if (prev.days > 0)
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const originalPrice =
    product.salePrice && product.salePrice > product.price
      ? product.salePrice
      : Math.round(product.price * 1.5)

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0')

  return (
    <div className="space-y-4">
      {/* Product Title */}
      <h1 className="product-detail-title text-[var(--color-ink)]">{product.name}</h1>

      {/* Product Short Description */}
      <p className="text-sm leading-6 text-[var(--color-muted)]">
        {product.shortDescription ||
          product.description ||
          'Buy one or buy a few and make every space where you sit more convenient. Light and easy to move around with removable tray top, handy for serving snacks.'}
      </p>

      {/* Price Section */}
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-2xl font-normal text-[var(--color-ink)]">
          {formatPrice(product.price)}
        </span>
        <span className="text-sm text-[var(--color-muted)] line-through">
          {formatPrice(originalPrice)}
        </span>
      </div>

      {/* Countdown Timer */}
      <div className="border-t border-[var(--color-line)] pt-3">
        <p className="mb-2 text-xs font-normal text-[var(--color-muted)]">Offer expires in:</p>
        <div className="grid max-w-sm grid-cols-4 gap-2">
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-1.5">
            <span className="font-display text-lg font-normal text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.days)}
            </span>
            <span className="text-xs text-[var(--color-muted)]">Days</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-1.5">
            <span className="font-display text-lg font-normal text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.hours)}
            </span>
            <span className="text-xs text-[var(--color-muted)]">Hours</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-1.5">
            <span className="font-display text-lg font-normal text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.minutes)}
            </span>
            <span className="text-xs text-[var(--color-muted)]">Mins</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-1.5">
            <span className="font-display text-lg font-normal text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.seconds)}
            </span>
            <span className="text-xs text-[var(--color-muted)]">Secs</span>
          </div>
        </div>
      </div>

      {/* Quantity & Wishlist Controls */}
      <div className="space-y-3 border-t border-[var(--color-line)] pt-3">
        <div className="flex items-center gap-2.5">
          {/* Quantity Counter */}
          <div className="flex h-10 items-center rounded-lg bg-[var(--color-surface)] px-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center text-base font-normal text-[var(--color-ink)] transition-colors hover:text-[var(--color-muted)]"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-7 text-center text-sm font-normal text-[var(--color-ink)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center text-base font-normal text-[var(--color-ink)] transition-colors hover:text-[var(--color-muted)]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Wishlist Button */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setIsWishlisted((prev) => !prev)}
            leftIcon={
              <Heart
                className={`h-4 w-4 shrink-0 ${
                  isWishlisted ? 'fill-danger text-danger' : 'text-ink-soft'
                }`}
              />
            }
            className={`flex-1 ${isWishlisted ? 'border-danger/40 text-danger' : ''}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            Wishlist
          </Button>
        </div>

        {/* Add to Cart Button */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() => addToCart(product, quantity)}
          leftIcon={<ShoppingBag className="h-4 w-4 shrink-0" />}
          className="w-full"
        >
          Add to Cart
        </Button>
      </div>

      {/* Product Metadata */}
      <div className="space-y-1.5 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
        <div className="flex gap-4">
          <span className="w-20 font-normal uppercase text-[var(--color-muted)]">SKU</span>
          <span className="text-[var(--color-ink)] font-normal">{product.sku || '1117'}</span>
        </div>
        <div className="flex gap-4">
          <span className="w-20 font-normal uppercase text-[var(--color-muted)]">CATEGORY</span>
          <span className="text-[var(--color-ink)] font-normal">{product.category.name}</span>
        </div>
      </div>
    </div>
  )
}

export default ProductInfo
