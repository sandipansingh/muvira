import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import type { ProductListItem, ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { RatingStars } from '../common/RatingStars'
import { StockBadge } from '../common/StockBadge'
import { Modal } from '../common/Modal'
import { useCart } from '../../context/CartContext'

interface QuickViewModalProps {
  product: ProductListItem | ProductDetail
  isOpen: boolean
  onClose: () => void
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart()
  const isDetail = 'images' in product
  const images = isDetail
    ? (product as ProductDetail).images.map((i) => i.url)
    : [(product as ProductListItem).primaryImageUrl]
  const categoryName = isDetail
    ? (product as ProductDetail).category.name
    : (product as ProductListItem).categoryName

  const [selectedImage, setSelectedImage] = useState(images[0] || '')
  const [qty, setQty] = useState(1)

  const handleAddToCart = () => {
    addToCart(product, qty)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Main Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-[#F6F4EF] border border-zinc-200">
            <img
              src={
                selectedImage ||
                images[0] ||
                'https://images.unsplash.com/photo-1555041469-a586c61ea9bc'
              }
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    (selectedImage || images[0]) === img
                      ? 'border-[#C88D35]'
                      : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#C88D35] uppercase tracking-wider">
                {categoryName}
              </span>
              <StockBadge
                quantity={'stock' in product ? product.stock : 10}
                isAvailable={'inStock' in product ? product.inStock : true}
              />
            </div>

            <h2 className="font-serif text-2xl font-bold text-zinc-900">{product.name}</h2>

            <RatingStars
              rating={product.rating || 4.8}
              count={product.reviewCount || 12}
              size="md"
            />

            <div className="flex items-baseline gap-3 pt-2">
              <span className="font-sans font-bold text-2xl text-zinc-900">
                {formatPrice(product.price)}
              </span>
              {product.salePrice && (
                <span className="text-sm text-zinc-400 line-through">
                  {formatPrice(product.salePrice)}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed font-light line-clamp-3">
              {'description' in product
                ? product.description
                : product.shortDescription ||
                  'Built with premium sustainable solid wood and crafted by master joiners.'}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100">
            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-zinc-700">Quantity:</span>
              <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-[#F6F4EF]">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-1.5 text-zinc-700 hover:bg-zinc-200 text-sm font-semibold"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-bold text-zinc-900">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-3 py-1.5 text-zinc-700 hover:bg-zinc-200 text-sm font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-zinc-900 hover:bg-[#C88D35] text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="px-6 py-3 bg-[#F6F4EF] hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 border border-zinc-200"
              >
                Full Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
