import React, { useState } from 'react'

// Exact-source overrides are added only after reviewing the filled crop.
const focalPoints: Record<string, string> = {}
const squareFocalPoints: Record<string, string> = {
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/products/1786036527347-ek3nr5ku-whatsapp-image-2026-03-06-at-7.52.22-pm.jpeg':
    '50% 22%',
}

export function StoreImage({
  src,
  alt,
  className = '',
  style,
  framing,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { framing?: 'square' }) {
  const [failedSource, setFailedSource] = useState<string>()
  if (!src || failedSource === src)
    return (
      <span
        className={`store-image-fallback ${className}`}
        role="img"
        aria-label={alt ? `${alt} — image unavailable` : 'Image unavailable'}
      >
        Image unavailable
      </span>
    )
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      style={{
        objectPosition:
          (framing === 'square' && squareFocalPoints[src]) || focalPoints[src] || '50% 50%',
        ...style,
      }}
      onError={() => setFailedSource(src)}
    />
  )
}
