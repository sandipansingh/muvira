import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Leaf } from 'lucide-react'
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
    const timer = setInterval(moveToNextSlide, 6000)
    return () => clearInterval(timer)
  }, [moveToNextSlide, slides.length])

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0)
  }, [currentIndex, slides.length])

  if (loading) {
    return (
      <div className="editorial-container my-6 h-[28rem] animate-pulse rounded-3xl bg-slate-200 sm:h-[38rem]" />
    )
  }

  if (slides.length === 0) return null
  const currentSlide = slides[currentIndex]

  const renderFormattedTitle = (title: string) => {
    const words = title.split(' ')
    if (words.length < 2) {
      return title
    }
    return words.map((word, idx) => {
      if (idx === 1) {
        return (
          <span key={idx} className="font-serif italic font-normal text-amber-100">
            {word}{' '}
          </span>
        )
      }
      return <span key={idx}>{word} </span>
    })
  }

  return (
    <section className="editorial-container py-4 sm:py-6">
      <div className="relative h-[32rem] sm:h-[38rem] lg:h-[42rem] w-full overflow-hidden rounded-3xl shadow-2xl">
        {/* Background Image Carousel */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'pointer-events-none opacity-0 z-0'
            }`}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="h-full w-full object-cover object-center"
            />
            {/* Dark gradient overlays for high text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          </div>
        ))}

        {/* Content Container Overlay */}
        <div className="relative z-20 flex h-full flex-col justify-between p-6 sm:p-12 lg:p-16 text-white">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Muvira Artisanal Collection
            </div>

            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={moveToPreviousSlide}
                  className="rounded-full border border-white/20 bg-black/30 p-2.5 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={moveToNextSlide}
                  className="rounded-full border border-white/20 bg-black/30 p-2.5 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Hero Headline & CTA */}
          <div className="max-w-xl space-y-5 my-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
              {renderFormattedTitle(currentSlide.title)}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-slate-200/90 max-w-md font-normal">
              {currentSlide.subtitle}
            </p>

            <div className="pt-2">
              <Link
                to={currentSlide.link}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-orange-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-orange-600/30 transition-all hover:bg-orange-700 hover:scale-105 active:scale-95"
              >
                <span>Shop now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Slide Indicator Dots */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2.5 pt-4">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-10 bg-white shadow-sm'
                      : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Glassmorphism Floating Badge (Bottom Right) */}
          <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 hidden sm:flex flex-col justify-between rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md shadow-2xl text-white w-56 sm:w-64 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-200 uppercase">
                Natural. Sustainable. Eco-conscious.
              </span>
              <Leaf className="h-5 w-5 text-emerald-400 shrink-0 ml-2" />
            </div>

            <div className="border-t border-white/10 pt-2 flex items-baseline justify-between">
              <span className="font-serif italic text-4xl sm:text-5xl font-normal text-amber-100">
                96%
              </span>
              <span className="text-xs text-slate-300 font-medium">Handcrafted Craft</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
