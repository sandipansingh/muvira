import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const AUTO_ROTATE_INTERVAL = 6000

export const HeroSlider: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const slides = settings.heroSlides || []

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (isPaused || slides.length <= 1) return undefined
    const timer = setInterval(nextSlide, AUTO_ROTATE_INTERVAL)
    return () => clearInterval(timer)
  }, [isPaused, nextSlide, slides.length])

  if (loading) {
    return (
      <section className="layout-container py-4 lg:py-6" aria-busy="true">
        <div className="w-full h-[450px] sm:h-[550px] lg:h-[75vh] rounded-[2rem] lg:rounded-[2.5rem] animate-pulse bg-neutral-100" />
      </section>
    )
  }

  if (slides.length === 0) return null

  const currentSlide = slides[currentIndex]

  return (
    <section
      id="home"
      className="layout-container py-3 lg:py-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero slider"
    >
      <div className="relative w-full h-[520px] sm:h-[600px] lg:h-[80vh] min-h-[500px] rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden bg-neutral-900 shadow-premium">
        {/* Background Image Carousel with Fade Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-0"
          >
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              className="h-full w-full object-cover"
            />
            {/* Ambient Vignette Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent z-10 hidden sm:block" />
          </motion.div>
        </AnimatePresence>

        {/* Foreground Content */}
        <div className="relative z-20 h-full flex flex-col justify-end p-6 sm:p-10 lg:p-16 max-w-4xl">
          <motion.div
            key={`content-${currentSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white border border-white/25 mb-3 sm:mb-4 select-none shadow-xs">
              Muvira Collection
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08] drop-shadow-sm font-display">
              {currentSlide.title}
            </h1>

            {currentSlide.subtitle && (
              <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-white/90 font-normal leading-relaxed max-w-2xl drop-shadow-sm">
                {currentSlide.subtitle}
              </p>
            )}

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={currentSlide.link || '/shop'}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-neutral-900 transition-all hover:bg-neutral-100 hover:shadow-md active:scale-98"
              >
                <span>Shop Collection</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Navigation Arrow Controls (Desktop) */}
        {slides.length > 1 && (
          <div className="absolute right-6 bottom-6 sm:right-10 sm:bottom-10 lg:right-16 lg:bottom-16 z-30 flex items-center gap-3">
            <button
              type="button"
              onClick={prevSlide}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dot Indicators */}
        {slides.length > 1 && (
          <div className="absolute left-6 bottom-6 sm:left-10 sm:bottom-8 lg:left-16 lg:bottom-8 z-30 flex items-center gap-2 hidden">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default HeroSlider
