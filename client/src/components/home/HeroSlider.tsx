import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const HeroSlider: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const slides = settings.heroSlides

  const moveToNextSlide = useCallback(() => {
    setCurrentIndex((previous) => (previous + 1) % slides.length)
  }, [slides.length])

  const moveToPreviousSlide = useCallback(() => {
    setCurrentIndex((previous) => (previous - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(moveToNextSlide, 5000)
    return () => clearInterval(timer)
  }, [moveToNextSlide, slides.length])

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0)
  }, [currentIndex, slides.length])

  if (loading) {
    return (
      <div className="editorial-container my-6 h-[24rem] animate-pulse bg-ivory sm:h-[36rem]" />
    )
  }

  if (slides.length === 0) return null
  const currentSlide = slides[currentIndex]

  return (
    <section className="editorial-container py-6 sm:py-10">
      <div className="grid border-y border-line lg:grid-cols-[1.7fr_0.8fr]">
        <div className="relative aspect-[4/3] overflow-hidden border-b border-line sm:aspect-[16/9] lg:border-b-0 lg:border-r">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={index !== currentIndex}
            >
              <img src={slide.imageUrl} alt={slide.title} className="h-full w-full object-cover" />
            </div>
          ))}
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 sm:bottom-6 sm:left-6">
              <button
                type="button"
                onClick={moveToPreviousSlide}
                className="border border-paper bg-paper/90 p-2 text-ink transition-colors hover:bg-ivory"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={moveToNextSlide}
                className="border border-paper bg-paper/90 p-2 text-ink transition-colors hover:bg-ivory"
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between bg-ivory p-6 sm:p-10 lg:p-12">
          <div>
            <p className="editorial-label">The new collection</p>
            <h1 className="editorial-heading mt-5 text-4xl leading-[0.95] sm:text-6xl">
              {currentSlide.title}
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted-ink">
              {currentSlide.subtitle}
            </p>
          </div>
          <div className="mt-10">
            <Link to={currentSlide.link} className="editorial-button">
              Explore the piece <ArrowRight className="h-4 w-4 text-cognac" />
            </Link>
            {slides.length > 1 && (
              <div className="mt-8 flex items-center gap-2" aria-label="Hero slides">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-px transition-colors ${
                      index === currentIndex ? 'w-10 bg-ink' : 'w-5 bg-line hover:bg-muted-ink'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === currentIndex}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
