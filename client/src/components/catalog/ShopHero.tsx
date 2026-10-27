import React from 'react'
import { Breadcrumbs, type BreadcrumbItem } from '../common/Breadcrumbs'

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
      <div className="flex items-end justify-between gap-8">
        <div className="max-w-2xl">
          <span className="eyebrow">The Muvira collection</span>
          <h1 className="mt-3 page-title">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl text-base leading-7 text-muted">{subtitle}</p>}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            width={240}
            height={240}
            className="hidden h-40 w-40 rounded-image object-cover md:block"
          />
        )}
      </div>
    </div>
  </div>
)
export default ShopHero
