import React, { useState } from 'react'
import type { ProductImage } from '../../lib/types/product'

interface ImageGalleryProps {
  images: (ProductImage | string)[]
  title: string
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const imageUrls = images.map((image) => (typeof image === 'string' ? image : image.url))
  const [activeImage, setActiveImage] = useState(imageUrls[0] ?? '')

  return (
    <div className="space-y-space-4">
      <div className="aspect-[4/3] overflow-hidden rounded-image bg-surface sm:aspect-square">
        {activeImage ? (
          <img src={activeImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ui text-muted">
            Image unavailable
          </div>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-space-3 overflow-x-auto py-space-1 no-scrollbar">
          {imageUrls.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-image border transition-colors duration-control ${
                activeImage === image
                  ? 'border-terracotta'
                  : 'border-rule opacity-60 hover:opacity-100'
              }`}
              aria-label={`View ${title} image ${index + 1}`}
            >
              <img
                src={image}
                alt={`${title} view ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
