import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { CollectionImage } from '../catalog/CollectionImage'
import { StoreImage } from './StoreImage'

export function CollectionScene({
  preferredSlug = 'handmade-showpiece',
  className = '',
}: {
  preferredSlug?: string
  className?: string
}) {
  const { categories } = useStoreCollections()
  const category = categories.find((item) => item.slug === preferredSlug) || categories[0]
  return category ? (
    <CollectionImage category={category} className={className} />
  ) : (
    <StoreImage
      src="/images/editorial/stone-alcove.webp"
      alt=""
      width={1536}
      height={1024}
      className={`collection-image ${className}`}
    />
  )
}
