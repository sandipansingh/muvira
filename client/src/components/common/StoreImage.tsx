import React, { useState } from 'react'

// Exact-source overrides are added only after reviewing the filled crop.
const focalPoints: Record<string, string> = {}

export function StoreImage({
  src,
  alt,
  className = '',
  style,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
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
      style={{ objectPosition: focalPoints[src] || '50% 50%', ...style }}
      onError={() => setFailedSource(src)}
    />
  )
}
