import React from 'react'
import { Breadcrumbs, type BreadcrumbItem } from '../common/Breadcrumbs'

interface ShopHeroProps {
  title: string
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
  imageUrl?: string
  className?: string
}

const DEFAULT_HERO_BG =
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80'

export const ShopHero: React.FC<ShopHeroProps> = ({
  title,
  subtitle = "Let's design the place you always imagined.",
  breadcrumbs,
  imageUrl = DEFAULT_HERO_BG,
  className = '',
}) => {
  return (
    <div className={`layout-container pt-4 pb-6 sm:pt-6 sm:pb-8 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-line min-h-[220px] sm:min-h-[260px] md:min-h-[280px] flex items-center justify-center text-center p-4 sm:p-8">
        {/* Clear, Rich Hero Image */}
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Subtle ambient light gradient for rich depth */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Centered Glass Backdrop Container for clear typography */}
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center bg-white/85 backdrop-blur-md px-6 sm:px-10 py-6 sm:py-7 rounded-2xl border border-white/90 shadow-sm">
          <Breadcrumbs items={breadcrumbs} className="mb-2 justify-center" />

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-normal text-ink tracking-tight leading-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted font-normal max-w-md leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopHero
