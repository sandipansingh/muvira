import React, { useEffect, useState } from 'react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductDetail, ProductListItem } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'
import { Modal } from '../common/Modal'

interface QuickViewModalProps {
  product: ProductListItem | ProductDetail
  isOpen: boolean
  onClose: () => void
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const isDetail = 'images' in product
  const images = isDetail ? product.images.map((image) => image.url) : [product.primaryImageUrl]
  const categoryName = isDetail ? product.category.name : product.categoryName
  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const initialImg = isDetail ? product.images[0]?.url : product.primaryImageUrl
      setSelectedImage(initialImg || '')
      setQuantity(1)
      setAdded(false)
    }
  }, [isOpen, product, isDetail])

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAdded(true)
    showToast(`Added ${quantity} × ${product.name} to your cart`, 'success')
    setTimeout(() => {
      onClose()
      setAdded(false)
    }, 600)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border-light bg-neutral-100 flex items-center justify-center">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-neutral-400 font-medium">
                Image unavailable
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                    selectedImage === image
                      ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                      : 'border-border-light opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {categoryName}
              </span>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mt-2">{product.name}</h2>
            <div className="mt-3">
              {product.rating !== null && product.rating !== undefined ? (
                <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
              ) : (
                <span className="text-xs text-neutral-400">No reviews yet</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              {product.salePrice && product.salePrice > product.price && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600 line-clamp-3">
              {'description' in product
                ? product.description
                : product.shortDescription || 'Description unavailable.'}
            </p>
          </div>

          <div className="border-t border-border-light pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Quantity
              </span>
              <div className="flex items-center rounded-full border border-border-light bg-neutral-50/60 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-neutral-100 transition-all font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-bold text-foreground">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground hover:bg-neutral-100 transition-all font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={added}
                className="editorial-button text-xs py-3 font-bold cursor-pointer"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Add to Cart
                  </>
                )}
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="editorial-button-secondary text-xs py-3 font-bold text-center justify-center"
              >
                Full Details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default QuickViewModal
