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
}) => {
  return (
    <div className={`layout-container pt-4 pb-6 sm:pt-6 sm:pb-8 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-line h-[300px] sm:h-[350px] md:h-[390px] flex items-center justify-center text-center p-6">
        {imageUrl && (
          <>
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white/60" />
          </>
        )}

        {/* Typography directly on the image — NO card container */}
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <Breadcrumbs items={breadcrumbs} className="mb-2 justify-center" />

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink tracking-tight leading-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-ink-soft font-normal max-w-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopHero
