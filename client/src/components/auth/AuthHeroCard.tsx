import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SlideItem {
  id: number
  title: string
  description: string
  image: string
}

const AUTH_SLIDES: SlideItem[] = [
  {
    id: 1,
    title: 'Discover your next journey',
    description:
      'Explore ideas, stories, and experiences designed to inspire your everyday life, guiding you through meaningful moments and fresh insights every day.',
    image:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 2,
    title: 'Crafted for timeless living',
    description:
      'Immerse yourself in artisanal furniture and curated interior designs crafted with passion, sustainability, and enduring beauty.',
    image:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 3,
    title: 'Elevate your personal space',
    description:
      'Transform every room into an inspiring haven of serenity and minimalist elegance designed for modern comfort.',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
  },
  {
    id: 4,
    title: 'Inspiration in every detail',
    description:
      'From natural wood textures to bespoke silhouettes, discover thoughtful craftsmanship tailored for the discerning home.',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=85',
  },
]

interface AuthHeroCardProps {
  className?: string
}

export const AuthHeroCard: React.FC<AuthHeroCardProps> = ({ className = '' }) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % AUTH_SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const slide = AUTH_SLIDES[currentSlide]

  return (
    <div
      className={`relative w-full h-full min-h-[380px] lg:min-h-[440px] lg:max-h-[560px] rounded-3xl overflow-hidden bg-neutral-950 flex flex-col justify-end p-5 sm:p-7 md:p-8 select-none shadow-lg ${className}`}
    >
      {/* Background Slides with Crossfade Animation */}
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.image}
          src={slide.image}
          alt={slide.title}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
        />
      </AnimatePresence>

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* Content Container positioned at bottom */}
      <div className="relative z-10 w-full space-y-3">
        {/* Pagination Indicator Bars */}
        <div className="flex items-center gap-2">
          {AUTH_SLIDES.map((item, index) => {
            const isActive = index === currentSlide
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                className={`h-1 rounded-full transition-all duration-400 cursor-pointer ${
                  isActive
                    ? 'w-7 bg-white shadow-xs'
                    : 'w-4 bg-white/40 hover:bg-white/70 hover:w-5'
                }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={isActive ? 'true' : 'false'}
              />
            )
          })}
        </div>

        {/* Text Content with Smooth Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-1.5"
          >
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              {slide.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-normal max-w-lg drop-shadow-xs">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AuthHeroCard
