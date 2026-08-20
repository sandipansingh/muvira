import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProductImage } from '../../lib/types/product'

interface ImageGalleryProps {
  images: (ProductImage | string)[]
  title: string
  isNew?: boolean
  discountPercent?: number
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  isNew = true,
  discountPercent = 50,
}) => {
  const imageUrls = images.map((image) => (typeof image === 'string' ? image : image.url))
  const [activeIndex, setActiveIndex] = useState(0)

  if (imageUrls.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center rounded-2xl bg-[var(--kit-surface)] text-xs text-[var(--kit-muted)]">
        Image unavailable
      </div>
    )
  }

  const activeImage = imageUrls[activeIndex] ?? imageUrls[0]

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--kit-surface)]">
        {/* Badges Stack */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
          {isNew && (
            <span className="inline-flex items-center justify-center rounded bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--kit-ink)] shadow-xs">
              NEW
            </span>
          )}
          {discountPercent > 0 && (
            <span className="inline-flex items-center justify-center rounded bg-[#38CB89] px-2.5 py-1 text-xs font-bold text-white shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Floating Navigation Arrows */}
        {imageUrls.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[var(--kit-ink)] shadow-md transition-transform hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[var(--kit-ink)] shadow-md transition-transform hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Main Image */}
        <img
          src={activeImage}
          alt={title}
          className="h-full w-full object-cover transition-opacity duration-200"
        />
      </div>

      {/* Thumbnails Row */}
      {imageUrls.length > 1 && (
        <div className="flex gap-3 overflow-x-auto py-1 no-scrollbar">
          {imageUrls.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-all ${
                activeIndex === index
                  ? 'border-2 border-[var(--kit-ink)] ring-2 ring-[var(--kit-ink)]/20 opacity-100'
                  : 'border border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`View ${title} thumbnail ${index + 1}`}
            >
              <img
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
