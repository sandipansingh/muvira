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
      <div className="editorial-container my-6 h-[24rem] animate-pulse rounded-3xl bg-slate-100 sm:h-[32rem]" />
    )
  }

  if (slides.length === 0) return null
  const currentSlide = slides[currentIndex]

  return (
    <section className="editorial-container py-6 sm:py-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/80 p-6 sm:p-10 lg:p-12 shadow-xs">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Content Column */}
          <div className="space-y-6 lg:col-span-6 lg:pr-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
              Featured Collection
            </div>

            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
              {currentSlide.title}
            </h1>

            <p className="max-w-md text-base leading-relaxed text-slate-600">
              {currentSlide.subtitle}
            </p>

            <div className="pt-2 flex items-center gap-4">
              <Link
                to={currentSlide.link}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-orange-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-600/25 transition-all hover:bg-orange-700 active:scale-95"
              >
                <span>Explore collection</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {slides.length > 1 && (
              <div className="flex items-center gap-2 pt-4" aria-label="Hero slides">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'w-8 bg-slate-900'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === currentIndex}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Image Gallery Column */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white shadow-md sm:aspect-[16/10] lg:col-span-6">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={index !== currentIndex}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}

            {slides.length > 1 && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={moveToPreviousSlide}
                  className="rounded-full border border-slate-200 bg-white/90 p-2 text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={moveToNextSlide}
                  className="rounded-full border border-slate-200 bg-white/90 p-2 text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
