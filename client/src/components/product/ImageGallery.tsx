import React, { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Expand,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ProductImage } from '../../lib/types/product'
import { Modal } from '../common/Modal'
import { StoreImage } from '../common/StoreImage'

interface ImageGalleryProps {
  images: (ProductImage | string)[]
  title: string
  isNew?: boolean
  discountPercent?: number
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  isNew = false,
  discountPercent = 0,
}) => {
  const imageUrls = images
    .map((image) => (typeof image === 'string' ? image : image.url))
    .filter(Boolean)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const reducedMotion = useReducedMotion()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const suppressClick = useRef(false)
  const index = activeIndex < imageUrls.length ? activeIndex : 0
  const activeImage = imageUrls[index]
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  const selectImage = (next: number) => {
    setActiveIndex((next + imageUrls.length) % imageUrls.length)
    resetView()
    setIsZooming(false)
  }
  const movePan = (x: number, y: number) =>
    setPan((current) => ({
      x: Math.max(-50, Math.min(50, current.x + x)),
      y: Math.max(-50, Math.min(50, current.y + y)),
    }))

  if (!activeImage)
    return (
      <div className="gallery-stage flex items-center justify-center text-sm text-muted">
        Image unavailable
      </div>
    )

  return (
    <div className="product-gallery">
      <div
        className="gallery-stage group"
        onPointerMove={(event) => {
          if (
            event.pointerType !== 'mouse' ||
            reducedMotion ||
            !window.matchMedia('(hover: hover) and (pointer: fine)').matches
          )
            return
          const rect = event.currentTarget.getBoundingClientRect()
          setZoomPos({
            x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
          })
          setIsZooming(true)
        }}
        onPointerLeave={() => setIsZooming(false)}
        onTouchStart={(event) => {
          touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
        }}
        onTouchEnd={(event) => {
          if (!touchStart.current) return
          const dx = event.changedTouches[0].clientX - touchStart.current.x
          const dy = event.changedTouches[0].clientY - touchStart.current.y
          touchStart.current = null
          if (imageUrls.length < 2 || Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return
          selectImage(index + (dx < 0 ? 1 : -1))
          suppressClick.current = true
          window.setTimeout(() => {
            suppressClick.current = false
          }, 300)
        }}
      >
        <button
          type="button"
          className="absolute inset-0 h-full w-full cursor-zoom-in"
          aria-label={`Enlarge image of ${title}`}
          onClick={() => {
            if (!suppressClick.current) {
              resetView()
              setIsLightboxOpen(true)
              setIsZooming(false)
            }
          }}
        >
          <motion.div
            className="h-full w-full"
            animate={{ scale: isZooming ? 2 : 1 }}
            style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
          >
            <StoreImage
              key={activeImage}
              src={activeImage}
              alt={title}
              width={1200}
              height={1500}
              className="h-full w-full object-contain"
            />
          </motion.div>
        </button>
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-2">
          {isNew && <span className="neutral-badge">Featured</span>}
          {discountPercent > 0 && <span className="status-badge">-{discountPercent}%</span>}
        </div>
        {imageUrls.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow left-3"
              aria-label="Previous image"
              onClick={() => selectImage(index - 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="gallery-arrow right-3"
              aria-label="Next image"
              onClick={() => selectImage(index + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 rounded-pill bg-paper/90 px-3 py-2 text-xs text-ink">
          <Expand className="h-4 w-4" /> Enlarge
        </span>
      </div>
      {imageUrls.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Product photographs">
          {imageUrls.map((image, thumbnail) => (
            <button
              key={`${image}-${thumbnail}`}
              type="button"
              aria-label={`View ${title} thumbnail ${thumbnail + 1}`}
              aria-pressed={thumbnail === index}
              onClick={() => selectImage(thumbnail)}
              className={`gallery-thumbnail ${thumbnail === index ? 'border-primary ring-1 ring-primary' : 'border-line hover:border-primary'}`}
            >
              <StoreImage
                src={image}
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
      <Modal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={title}
        maxWidth="gallery"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            const direction = event.key === 'ArrowRight' ? 1 : -1
            if (zoom === 2) movePan(-direction * 15, 0)
            else selectImage(index + direction)
          } else if (zoom === 2 && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault()
            movePan(0, event.key === 'ArrowUp' ? 15 : -15)
          } else if (event.key === '+' || event.key === '=') setZoom(2)
          else if (event.key === '-' || event.key === '0') resetView()
        }}
      >
        <div>
          <div
            className={`lightbox-stage ${zoom === 2 ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
            onPointerDown={(event) => {
              if (zoom !== 2) return
              event.currentTarget.setPointerCapture(event.pointerId)
              dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
            }}
            onPointerMove={(event) => {
              const start = dragStart.current
              if (!start || zoom !== 2) return
              const rect = event.currentTarget.getBoundingClientRect()
              setPan({
                x: Math.max(
                  -50,
                  Math.min(50, start.panX + ((event.clientX - start.x) / rect.width) * 100)
                ),
                y: Math.max(
                  -50,
                  Math.min(50, start.panY + ((event.clientY - start.y) / rect.height) * 100)
                ),
              })
            }}
            onPointerUp={() => {
              dragStart.current = null
            }}
            onPointerCancel={() => {
              dragStart.current = null
            }}
          >
            <motion.img
              key={activeImage}
              src={activeImage}
              alt={title}
              data-lightbox-image
              data-zoom={zoom}
              draggable={false}
              width={1600}
              height={1600}
              className="h-full w-full select-none object-contain"
              animate={{ scale: zoom, x: `${pan.x}%`, y: `${pan.y}%` }}
              transition={{ duration: reducedMotion || dragStart.current ? 0 : 0.18 }}
            />
          </div>
          <div className="lightbox-controls">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="button-secondary p-3"
                aria-label="Previous image"
                disabled={imageUrls.length < 2}
                onClick={() => selectImage(index - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm tabular-nums" aria-live="polite">
                {index + 1} / {imageUrls.length}
              </span>
              <button
                type="button"
                className="button-secondary p-3"
                aria-label="Next image"
                disabled={imageUrls.length < 2}
                onClick={() => selectImage(index + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="button-secondary gap-2 px-3"
                aria-label={zoom === 1 ? 'Zoom to 2×' : 'Zoom to 1×'}
                onClick={() => {
                  setZoom(zoom === 1 ? 2 : 1)
                  setPan({ x: 0, y: 0 })
                }}
              >
                {zoom === 1 ? <ZoomIn className="h-4 w-4" /> : <ZoomOut className="h-4 w-4" />}{' '}
                {zoom}×
              </button>
              <button
                type="button"
                className="button-secondary p-3"
                aria-label="Reset view"
                onClick={resetView}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          {zoom === 2 && (
            <div
              className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-3"
              aria-label="Pan photograph"
            >
              {[
                { label: 'Pan left', icon: ArrowLeft, x: 15, y: 0 },
                { label: 'Pan right', icon: ArrowRight, x: -15, y: 0 },
                { label: 'Pan up', icon: ArrowUp, x: 0, y: 15 },
                { label: 'Pan down', icon: ArrowDown, x: 0, y: -15 },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  className="button-secondary p-3"
                  aria-label={control.label}
                  onClick={() => movePan(control.x, control.y)}
                >
                  <control.icon className="h-4 w-4" />
                </button>
              ))}
              <p className="w-full text-center text-sm text-muted">
                Drag the image or use the arrow controls to explore.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
export default ImageGallery
