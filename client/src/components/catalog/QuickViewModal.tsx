import React, { useState } from 'react'
import { ArrowRight, ShoppingBag } from 'lucide-react'
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

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart()
  const isDetail = 'images' in product
  const images = isDetail ? product.images.map((image) => image.url) : [product.primaryImageUrl]
  const categoryName = isDetail ? product.category.name : product.categoryName
  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    addToCart(product, quantity)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden border border-line bg-ivory">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-ink">
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
                  className={`h-16 w-16 shrink-0 overflow-hidden border transition-colors ${
                    selectedImage === image
                      ? 'border-cognac'
                      : 'border-line opacity-60 hover:opacity-100'
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

        <div className="flex flex-col justify-between gap-8">
          <div>
            <div className="flex items-start justify-between gap-4">
              <p className="editorial-label text-[10px]">{categoryName}</p>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>
            <h2 className="editorial-heading mt-4 text-3xl">{product.name}</h2>
            <div className="mt-4">
              {product.rating !== null && product.rating !== undefined ? (
                <RatingStars rating={product.rating} count={product.reviewCount} size="md" />
              ) : (
                <span className="text-xs text-muted-ink">No reviews yet</span>
              )}
            </div>
            <div className="mt-5 flex items-baseline gap-3 border-y border-line py-4">
              <span className="text-2xl font-semibold text-ink">{formatPrice(product.price)}</span>
              {product.salePrice && product.salePrice > product.price && (
                <span className="text-sm text-muted-ink line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-ink">
              {'description' in product
                ? product.description
                : product.shortDescription || 'Description unavailable.'}
            </p>
          </div>

          <div className="border-t border-line pt-5">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-ink">Quantity</span>
              <div className="flex items-center border border-line">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-ink hover:bg-ivory"
                >
                  −
                </button>
                <span className="min-w-10 border-x border-line px-3 py-2 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-ink hover:bg-ivory"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleAddToCart} className="editorial-button">
                <ShoppingBag className="h-4 w-4" /> Add to cart
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="editorial-button-secondary"
              >
                Full details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
