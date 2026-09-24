import React, { useEffect, useState } from 'react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'
import { Modal } from '../common/Modal'

interface QuickViewModalProps {
  product: ProductListItem | ProductDetail
  isOpen: boolean
  onClose: () => void
}

const getDiscountPercent = (product: ProductListItem | ProductDetail) => {
  if (product.discountPercent > 0) return product.discountPercent
  if (!product.salePrice || product.salePrice <= product.price) return 0
  return Math.round(((product.salePrice - product.price) / product.salePrice) * 100)
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart()
  const isDetail = 'images' in product
  const images = isDetail ? product.images.map((image) => image.url) : [product.primaryImageUrl]
  const categoryName = isDetail ? product.category.name : product.categoryName
  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const discountPercent = getDiscountPercent(product)
  const hasDiscount = Boolean(product.salePrice && product.salePrice > product.price)
  const description = 'description' in product ? product.description : product.shortDescription

  useEffect(() => {
    if (isOpen) {
      const initialImg = isDetail ? product.images[0]?.url : product.primaryImageUrl
      setSelectedImage(initialImg || '')
      setQuantity(1)
      setAdded(false)
    }
  }, [isOpen, product, isDetail])

  const handleAddToCart = async () => {
    try {
      await addToCart(product, quantity)
      setAdded(true)
      setTimeout(() => {
        onClose()
        setAdded(false)
      }, 600)
    } catch {
      setAdded(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid gap-5 md:grid-cols-2 md:items-stretch">
        {/* Left Column: Product Gallery & Badges */}
        <div className="flex flex-col justify-between space-y-3 md:h-full">
          <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface)] sm:min-h-[340px] md:min-h-[400px]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                width={800}
                height={800}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-normal text-muted">
                Image unavailable
              </div>
            )}

            {/* Badges on Image */}
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
              {product.isFeatured && (
                <span className="neutral-badge font-normal uppercase">FEATURED</span>
              )}
              {discountPercent > 0 && <span className="status-badge">-{discountPercent}%</span>}
            </div>
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-control)] border transition-colors ${
                    selectedImage === image
                      ? 'border-[var(--color-ink)]'
                      : 'border-[var(--color-line)] opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details, Highlights & Purchase Controls */}
        <div className="flex flex-col justify-between space-y-3 md:h-full">
          <div>
            {/* Category & Stock Status */}
            <div className="flex items-center justify-between gap-4 pr-10">
              <span className="eyebrow">{categoryName}</span>
              <StockBadge quantity={product.stock} isAvailable={product.inStock} />
            </div>

            {/* Product Title */}
            <h2 className="text-product-title mt-2 pr-10 line-clamp-2 text-[var(--color-ink)]">
              {product.name}
            </h2>

            {product.rating != null && (product.reviewCount ?? 0) > 0 && (
              <div className="mt-2.5 text-xs">
                <RatingStars
                  rating={product.rating}
                  count={product.reviewCount}
                  size="sm"
                  showText
                />
              </div>
            )}

            {/* Pricing Row */}
            <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <span className="font-sans text-2xl font-bold text-[var(--color-ink)]">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && product.salePrice && (
                <span className="product-card__meta text-sm line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="rounded-[var(--radius-control)] bg-primary-soft px-2 py-0.5 text-xs font-normal text-primary">
                  Save {discountPercent}%
                </span>
              )}
            </div>

            {/* Product Description */}
            {description && (
              <p className="body-copy mt-3 line-clamp-3 text-base leading-relaxed">{description}</p>
            )}

            {/* Metadata Chips */}
            {'sku' in product && product.sku && (
              <div className="mt-2.5 text-sm text-muted">
                <span className="font-normal uppercase">SKU:</span>{' '}
                <span className="font-normal text-ink">{product.sku}</span>
              </div>
            )}
          </div>

          {/* Action Section */}
          <div className="space-y-3 border-t border-[var(--color-line)] pt-3">
            <div className="flex items-center gap-3">
              <span className="eyebrow">Quantity</span>
              <div className="flex items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-base font-normal text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-7 text-center text-base font-normal text-[var(--color-ink)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-base font-normal text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={added || !product.inStock}
                className="button-primary min-h-[var(--tap-target)] gap-1.5 px-4 text-sm"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="leading-none">Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                    <span className="leading-none">
                      {product.inStock ? 'Add to Cart' : 'Unavailable'}
                    </span>
                  </>
                )}
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="button-secondary min-h-[var(--tap-target)] justify-center gap-1.5 px-4 text-center text-sm"
              >
                <span className="leading-none">View Full Details</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default QuickViewModal
