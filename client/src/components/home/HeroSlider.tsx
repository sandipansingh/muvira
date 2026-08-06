import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Star } from 'lucide-react'
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
      <div className="editorial-container my-6 h-[28rem] animate-pulse rounded-[2.5rem] bg-slate-100 sm:h-[36rem]" />
    )
  }

  if (slides.length === 0) return null
  const currentSlide = slides[currentIndex]

  return (
    <section className="editorial-container py-6 sm:py-8">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/40 p-8 sm:p-12 lg:p-16 border border-slate-200/80 shadow-xs">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Rating, Headline, Callout, Dual CTAs */}
          <div className="space-y-6 lg:col-span-6 lg:pr-4">
            {/* Rating Badge with User Avatars */}
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs">
              <div className="flex -space-x-1.5 overflow-hidden">
                <span className="inline-block h-6 w-6 rounded-full bg-slate-300 ring-2 ring-white text-[10px] flex items-center justify-center font-bold text-slate-700">
                  A
                </span>
                <span className="inline-block h-6 w-6 rounded-full bg-orange-200 ring-2 ring-white text-[10px] flex items-center justify-center font-bold text-orange-800">
                  R
                </span>
                <span className="inline-block h-6 w-6 rounded-full bg-emerald-200 ring-2 ring-white text-[10px] flex items-center justify-center font-bold text-emerald-800">
                  M
                </span>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span className="font-bold text-slate-900">4.9/5</span>
              </div>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">18,131 Reviews</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-sans font-black text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.08] uppercase">
              {currentSlide.title}
            </h1>

            {/* Subtitle Paragraph */}
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-lg font-medium">
              {currentSlide.subtitle}
            </p>

            {/* Feature Stat Callouts */}
            <div className="flex items-center gap-8 border-t border-slate-200/80 pt-6">
              <div>
                <div className="text-2xl font-black text-slate-900">100%</div>
                <div className="text-xs font-medium text-slate-500">Authentic Solid Craft</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-2xl font-black text-slate-900">2.4k+</div>
                <div className="text-xs font-medium text-slate-500">Happy Homes Served</div>
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={currentSlide.link}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-orange-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition-all hover:bg-orange-700 hover:scale-105 active:scale-95"
              >
                <span>Shop Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-full border-2 border-slate-900 px-8 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-900 hover:text-white active:scale-95"
              >
                Explore Collections
              </Link>
            </div>

            {/* Slide Navigation Dots */}
            {slides.length > 1 && (
              <div className="flex items-center gap-2 pt-4">
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
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Showcase Frame */}
          <div className="relative flex justify-center lg:col-span-6">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl border-4 border-white transition-all hover:scale-102">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === currentIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
