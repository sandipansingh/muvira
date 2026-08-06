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
    <div className="space-y-4">
      <div className="aspect-[4/3] overflow-hidden border-y border-line bg-ivory sm:aspect-square">
        {activeImage ? (
          <img src={activeImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-ink">
            Image unavailable
          </div>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {imageUrls.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`h-20 w-20 shrink-0 overflow-hidden border transition-colors ${
                activeImage === image ? 'border-cognac' : 'border-line opacity-60 hover:opacity-100'
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
