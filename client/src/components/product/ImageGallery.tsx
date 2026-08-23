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
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  if (imageUrls.length === 0) {
    return (
      <div className="flex aspect-square max-h-[520px] items-center justify-center rounded-2xl border border-line bg-surface text-xs font-normal text-muted">
        Image unavailable
      </div>
    )
  }

  const activeImage = imageUrls[activeIndex] ?? imageUrls[0]

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setZoomPos({ x, y })
  }

  return (
    <div className="relative flex flex-col-reverse gap-3.5 md:flex-row md:items-start md:gap-4">
      {/* Thumbnails Navigation */}
      {imageUrls.length > 1 && (
        <div className="flex max-h-[480px] gap-2.5 overflow-x-auto py-0.5 no-scrollbar md:max-h-[500px] md:w-20 md:shrink-0 md:flex-col md:overflow-y-auto lg:max-h-[520px]">
          {imageUrls.map((image, index) => {
            const isActive = activeIndex === index
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-square w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white transition-all duration-200 md:w-20 ${
                  isActive
                    ? 'border-2 border-primary ring-2 ring-primary/15 opacity-100 shadow-xs'
                    : 'border border-line bg-white opacity-75 hover:border-field-border hover:opacity-100'
                }`}
                aria-label={`View ${title} thumbnail ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-full w-full object-contain p-1"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* 1:1 Square Main Image Showcase Container with Crisp Object Contain */}
      <div
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
        className="group relative aspect-square max-h-[480px] w-full flex-1 cursor-crosshair overflow-hidden rounded-2xl border border-line/70 bg-white p-2 md:max-h-[500px] lg:max-h-[520px]"
      >
        {/* Badges Stack */}
        <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex flex-col items-start gap-1.5">
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
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--radius-control)] bg-white/90 text-ink shadow-sm transition-all hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--radius-control)] bg-white/90 text-ink shadow-sm transition-all hover:scale-105 hover:bg-white active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Main Base Image - Full Uncropped View */}
        <img src={activeImage} alt={title} className="h-full w-full object-contain" />

        {/* Amazon-Style Lens Overlay Box */}
        {isZooming && (
          <div
            className="pointer-events-none absolute h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/50 bg-primary/15 shadow-sm backdrop-blur-[1px]"
            style={{
              left: `${zoomPos.x}%`,
              top: `${zoomPos.y}%`,
            }}
          />
        )}
      </div>

      {/* Matching 1:1 Floating Side Zoom Preview Window */}
      {isZooming && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-50 hidden aspect-square h-[480px] w-[480px] overflow-hidden rounded-2xl border border-line/80 bg-white shadow-2xl lg:left-[calc(100%+1.25rem)] lg:block md:h-[500px] md:w-[500px] lg:h-[520px] lg:w-[520px]"
          style={{
            backgroundImage: `url(${activeImage})`,
            backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
            backgroundSize: '220%',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
    </div>
  )
}

export default ImageGallery
