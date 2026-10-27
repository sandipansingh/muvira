import React from 'react'
import { Breadcrumbs, type BreadcrumbItem } from '../common/Breadcrumbs'
import { StoreImage } from '../common/StoreImage'
import { collectionImage } from '../../lib/utils/collectionImage'

interface ShopHeroProps {
  title: string
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
  imageUrl?: string
  className?: string
}

export const ShopHero: React.FC<ShopHeroProps> = ({
  title,
  subtitle,
  breadcrumbs,
  imageUrl,
  className = '',
}) => (
  <div className={`catalog-heading ${className}`}>
    <div className="layout-container">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />
      <div className="catalog-heading__layout">
        <div className="max-w-2xl">
          <span className="eyebrow">The Muvira collection</span>
          <h1 className="mt-3 page-title">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl text-base leading-7 text-muted">{subtitle}</p>}
        </div>
        {imageUrl && (
          <StoreImage
            {...collectionImage(imageUrl)}
            sizes="(max-width: 639px) 100vw, 40vw"
            alt=""
            width={240}
            height={240}
            className="catalog-heading__image"
          />
        )}
      </div>
    </div>
  </div>
)
export default ShopHero
