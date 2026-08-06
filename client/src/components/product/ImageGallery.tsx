import React, { useState } from 'react'
import type { ProductImage } from '../../lib/types/product'

interface ImageGalleryProps {
  images: (ProductImage | string)[]
  title: string
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const imageUrls =
    images.length > 0
      ? images.map((img) => (typeof img === 'string' ? img : img.url))
      : [
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
        ]

  const [activeImage, setActiveImage] = useState(imageUrls[0])

  return (
    <div className="space-y-4">
      {/* Main Large Image Container */}
      <div className="relative aspect-4/3 sm:aspect-square rounded-3xl overflow-hidden bg-[#F6F4EF] border border-zinc-200/80 shadow-xs group">
        <img
          src={activeImage}
          alt={title}
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Thumbnail Bar */}
      {imageUrls.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {imageUrls.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden bg-[#F6F4EF] border-2 transition-all shrink-0 ${
                activeImage === img
                  ? 'border-[#C88D35] ring-2 ring-[#C88D35]/20'
                  : 'border-zinc-200 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
