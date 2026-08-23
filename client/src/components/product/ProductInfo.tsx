import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Heart, ShieldCheck, ShoppingBag, Sparkles, Truck, Undo2 } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { RatingStars } from '../common/RatingStars'
import { Button } from '../ui/Button'

interface ProductInfoProps {
  product: ProductDetail
  onReviewClick?: () => void
}

const defaultVariants = [
  { id: 'natural-teak', label: 'Natural Teak' },
  { id: 'warm-walnut', label: 'Warm Walnut' },
  { id: 'honey-amber', label: 'Honey Amber' },
  { id: 'classic-sheesham', label: 'Classic Sheesham' },
]

export const ProductInfo: React.FC<ProductInfoProps> = ({ product, onReviewClick }) => {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(defaultVariants[0].id)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  const effectiveRating = product.rating ?? 4.7
  const totalReviews = product.reviewCount || 48
  const estimatedOrders = useMemo(() => {
    return Math.max(120, (product.reviewCount || 24) * 4 + 32)
  }, [product.reviewCount])

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
    <div className="flex flex-col space-y-5">
      {/* Product Title */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-normal leading-tight text-ink sm:text-3xl lg:text-[2rem]">
          {product.name}
        </h1>

        {/* Rating and Social Proof Header (References 1 & 2) */}
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

          <span className="text-line">•</span>

          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-normal text-ink-soft">
            <Sparkles className="h-3 w-3 text-primary" />
            {estimatedOrders}+ sold this month
          </span>
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

      {/* Quick Metadata Highlights (Reference 1: Made In, Design, Delivery) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-line bg-surface/60 p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-18 shrink-0 font-normal uppercase text-muted">Made In:</span>
          <span className="font-normal text-ink">Jaipur, Rajasthan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-18 shrink-0 font-normal uppercase text-muted">Craft:</span>
          <span className="font-normal text-ink">Solid Sheesham</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-18 shrink-0 font-normal uppercase text-muted">Dispatch:</span>
          <span className="font-normal text-primary">Within 24 Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-18 shrink-0 font-normal uppercase text-muted">Delivery:</span>
          <span className="font-normal text-ink">2–5 Days (Pan-India)</span>
        </div>
      </div>

      {/* Variant / Option Selector (Reference 1 & 2: Pill Buttons with Active Tint) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-normal">
          <span className="text-muted uppercase tracking-wider">Choose Finish / Variant</span>
          <span className="text-ink font-normal">
            {defaultVariants.find((v) => v.id === selectedVariant)?.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {defaultVariants.map((variant) => {
            const isSelected = selectedVariant === variant.id
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariant(variant.id)}
                className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-3.5 text-xs font-normal transition-all ${
                  isSelected
                    ? 'border border-primary bg-primary-soft text-primary ring-2 ring-primary/20'
                    : 'border border-line bg-white text-ink hover:border-field-border hover:bg-surface'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                <span>{variant.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Free Standard Shipping Callout (Reference 2) */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-xs text-ink-soft">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
          <Truck className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-normal text-ink">Free Express Shipping across India</p>
          <p className="text-[11px] text-muted">
            Estimated delivery: 2–5 working days • Fully insured transit
          </p>
        </div>
      </div>

      {/* Quantity Selector, Add to Cart, Buy Now & Wishlist Controls (Reference 1 & 2) */}
      <div className="space-y-3 pt-1">
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

          {/* Add to Cart Button */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={isAdding}
            onClick={handleAddToCart}
            leftIcon={<ShoppingBag className="h-4 w-4 shrink-0" />}
            className="flex-1"
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

        {/* Buy Now Direct Checkout Button */}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          isLoading={isBuyingNow}
          onClick={handleBuyNow}
          className="w-full bg-ink text-white hover:bg-ink-soft"
        >
          Buy Now (Direct Checkout)
        </Button>
      </div>

      {/* Single-Brand Direct Workshop Guarantee */}
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-[11px] text-muted">
        <div className="flex flex-col items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-normal text-ink-soft">100% Authentic</span>
          <span>Direct Jaipur craft</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Truck className="h-4 w-4 text-primary" />
          <span className="font-normal text-ink-soft">Insured Transit</span>
          <span>Wooden crate packing</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Undo2 className="h-4 w-4 text-primary" />
          <span className="font-normal text-ink-soft">30-Day Returns</span>
          <span>Hassle-free pickup</span>
        </div>
      </div>
    </div>
  )
}

export default ProductInfo
