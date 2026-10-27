import type { Category } from '../../lib/types/category'
import { StoreImage } from '../common/StoreImage'
import { collectionImage } from '../../lib/utils/collectionImage'

export function CollectionImage({
  category,
  className = '',
  priority = false,
}: {
  category: Category
  className?: string
  priority?: boolean
}) {
  return (
    <StoreImage
      {...collectionImage(category.imageUrl)}
      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 45vw"
      alt={category.name}
      width={960}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      className={`collection-image ${className}`}
    />
  )
}
