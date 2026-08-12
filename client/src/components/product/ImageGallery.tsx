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
      <div className="aspect-[4/3] overflow-hidden rounded-[2rem] bg-neutral-100 border border-neutral-100 shadow-sm sm:aspect-square">
        {activeImage ? (
          <img src={activeImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            Image unavailable
          </div>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-3 overflow-x-auto py-1 no-scrollbar">
          {imageUrls.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer ${
                activeImage === image
                  ? 'border-neutral-900 shadow-xs'
                  : 'border-border-light opacity-70 hover:opacity-100'
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

export default ImageGallery
