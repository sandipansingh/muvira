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
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-surface border border-line min-h-[200px] sm:min-h-[240px] md:min-h-[280px] flex flex-col items-center justify-center text-center px-4 py-8 sm:py-12">
        {/* Soft Ambient Background with subtle gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 pointer-events-none transition-transform duration-700"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/60 to-white/40 pointer-events-none backdrop-blur-[1px]" />

        {/* Content Container */}
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <Breadcrumbs items={breadcrumbs} className="mb-3 sm:mb-4 justify-center" />

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-normal text-ink tracking-tight leading-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-muted font-normal max-w-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopHero
