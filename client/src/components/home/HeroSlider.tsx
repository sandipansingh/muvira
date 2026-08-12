import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const HeroSlider: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const slides = settings.heroSlides

  const moveToNextSlide = useCallback(() => {
    setCurrentIndex((previous) => (previous + 1) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) return undefined

    const timer = setInterval(moveToNextSlide, 6000)
    return () => clearInterval(timer)
  }, [moveToNextSlide, slides.length])

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0)
  }, [currentIndex, slides.length])

  if (loading) {
    return (
      <section className="py-space-16 md:py-space-24" aria-busy="true">
        <div className="editorial-container">
          <div className="aspect-[5/4] animate-pulse bg-surface lg:aspect-[2/1]" />
        </div>
      </section>
    )
  }

  if (slides.length === 0) return null

  const currentSlide = slides[currentIndex]

  return (
    <section className="py-space-16 md:py-space-24">
      <div className="editorial-container">
        <div className="grid gap-space-12 lg:grid-cols-2 lg:items-center lg:gap-space-16">
          <div className="order-1">
            <p className="editorial-label">Muvira collection</p>
            <h1 className="editorial-heading mt-space-4 text-display-xl-mobile lg:text-display-xl-desktop">
              {currentSlide.title}
            </h1>
            {currentSlide.subtitle && (
              <p className="mt-space-6 max-w-2xl text-body-l-mobile text-ink lg:text-body-l-desktop">
                {currentSlide.subtitle}
              </p>
            )}
            <div className="mt-space-8">
              <Link to={currentSlide.link} className="editorial-button min-h-11">
                Shop collection
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="order-2">
            <div className="relative aspect-[5/4] overflow-hidden rounded-image bg-surface lg:aspect-[4/5]">
              {slides.map((slide, index) => (
                <img
                  key={slide.id}
                  src={slide.imageUrl}
                  alt={slide.title}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-hero motion-reduce:transition-none ${
                    index === currentIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                />
              ))}
            </div>

            {slides.length > 1 && (
              <div className="mt-space-4 flex items-center gap-space-1" aria-label="Hero slides">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className="flex h-11 w-11 items-center justify-center"
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : undefined}
                  >
                    <span
                      className={`h-2 rounded-pill transition-colors duration-control motion-reduce:transition-none ${
                        index === currentIndex ? 'w-6 bg-ink' : 'w-2 bg-rule'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
