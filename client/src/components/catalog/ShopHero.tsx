import React from 'react'
import type { BreadcrumbItem } from '../common/Breadcrumbs'
import { CustomerPageHeading } from '../common/CustomerPageHeading'

interface ShopHeroProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export const ShopHero: React.FC<ShopHeroProps> = ({
  title,
  subtitle,
  breadcrumbs,
  className = '',
}) => (
  <div className={`catalog-heading ${className}`}>
    <div className="layout-container">
      <CustomerPageHeading title={title} description={subtitle} breadcrumbs={breadcrumbs} />
    </div>
  </div>
)
export default ShopHero
