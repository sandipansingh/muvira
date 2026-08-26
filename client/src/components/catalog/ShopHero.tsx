import React from 'react'
import { Breadcrumbs, type BreadcrumbItem } from '../common/Breadcrumbs'

interface ShopHeroProps {
  title: string
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
  imageUrl?: string
  className?: string
}

export const HOME_DECOR_HERO_IMAGE =
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=85'

export const ShopHero: React.FC<ShopHeroProps> = ({
  title,
  subtitle = "Let's design the place you always imagined.",
  breadcrumbs,
  imageUrl = HOME_DECOR_HERO_IMAGE,
  className = '',
}) => {
  return (
    <div className={`layout-container pt-4 pb-6 sm:pt-6 sm:pb-8 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-line h-[300px] sm:h-[350px] md:h-[390px] flex items-center justify-center text-center p-6">
        {/* Crisp, Bright Home Decor Background Image */}
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Soft natural lighting overlay for pure text contrast directly on image */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white/60 pointer-events-none" />

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
