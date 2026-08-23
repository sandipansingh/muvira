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
    <div className="space-y-6">
      {/* Product Title */}
      <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
        {product.name}
      </h1>

      {/* Product Short Description */}
      <p className="text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
        {product.shortDescription ||
          product.description ||
          'Buy one or buy a few and make every space where you sit more convenient. Light and easy to move around with removable tray top, handy for serving snacks.'}
      </p>

      {/* Price Section */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">
          {formatPrice(product.price)}
        </span>
        <span className="text-base text-[var(--color-muted)] line-through">
          {formatPrice(originalPrice)}
        </span>
      </div>

      {/* Countdown Timer */}
      <div className="border-t border-[var(--color-line)] pt-4">
        <p className="mb-3 text-xs font-medium text-[var(--color-muted)]">Offer expires in:</p>
        <div className="grid grid-cols-4 gap-3 max-w-xs">
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.days)}
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">Days</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.hours)}
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">Hours</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.minutes)}
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">Mins</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-[var(--color-surface)] py-2">
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">
              {formatTwoDigits(timeLeft.seconds)}
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">Secs</span>
          </div>
        </div>
      </div>

      {/* Quantity & Wishlist Controls */}
      <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
        <div className="flex items-center gap-3">
          {/* Quantity Counter */}
          <div className="flex h-12 items-center rounded-lg bg-[var(--color-surface)] px-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center text-lg font-bold text-[var(--color-ink)] transition-colors hover:text-[var(--color-muted)]"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-[var(--color-ink)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center text-lg font-bold text-[var(--color-ink)] transition-colors hover:text-[var(--color-muted)]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => setIsWishlisted((prev) => !prev)}
            className={`flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-ink)] bg-transparent px-4 font-semibold text-sm transition-colors ${
              isWishlisted
                ? 'border-red-500 text-red-500'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 shrink-0 ${isWishlisted ? 'fill-current' : ''}`} />
            <span className="leading-none">Wishlist</span>
          </button>
        </div>

        {/* Add to Cart Button */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() => addToCart(product, quantity)}
          leftIcon={<ShoppingBag className="h-5 w-5 shrink-0" />}
          className="w-full"
        >
          Add to Cart
        </Button>
      </div>

      {/* Product Metadata */}
      <div className="space-y-1.5 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)]">
        <div className="flex gap-4">
          <span className="w-20 font-semibold uppercase text-[var(--color-muted)]">SKU</span>
          <span className="text-[var(--color-ink)] font-medium">{product.sku || '1117'}</span>
        </div>
        <div className="flex gap-4">
          <span className="w-20 font-semibold uppercase text-[var(--color-muted)]">CATEGORY</span>
          <span className="text-[var(--color-ink)] font-medium">{product.category.name}</span>
        </div>
      </div>
    </div>
  )
}

export default ProductInfo
