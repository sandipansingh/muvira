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
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-line bg-surface text-xs font-normal text-muted">
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
    <div className="flex flex-col-reverse gap-3 md:flex-row md:items-start md:gap-4">
      {/* Thumbnails Navigation (Vertical column on desktop, horizontal row on mobile) */}
      {imageUrls.length > 1 && (
        <div className="flex max-h-[560px] gap-2 overflow-x-auto py-1 no-scrollbar md:w-20 md:shrink-0 md:flex-col md:overflow-y-auto">
          {imageUrls.map((image, index) => {
            const isActive = activeIndex === index
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-square w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 md:w-20 ${
                  isActive
                    ? 'border-2 border-ink ring-2 ring-ink/10 opacity-100 shadow-xs'
                    : 'border border-line bg-surface opacity-70 hover:border-field-border hover:opacity-100'
                }`}
                aria-label={`View ${title} thumbnail ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Main Image Showcase Container */}
      <div className="group relative aspect-square flex-1 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {/* Badges Stack */}
        <div className="absolute left-3.5 top-3.5 z-10 flex flex-col items-start gap-1.5">
          {isNew && (
            <span className="inline-flex items-center justify-center rounded bg-white/95 px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider text-ink shadow-xs backdrop-blur-xs">
              NEW
            </span>
          )}
          {discountPercent > 0 && (
            <span className="inline-flex items-center justify-center rounded bg-primary px-2.5 py-0.5 text-xs font-normal text-white shadow-xs">
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
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--radius-control)] bg-white/90 text-ink shadow-sm transition-all hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--radius-control)] bg-white/90 text-ink shadow-sm transition-all hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Main Image */}
        <img
          src={activeImage}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
    </div>
  )
}

export default ImageGallery
