import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
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
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/30 p-8 sm:p-12 lg:p-16 border border-slate-200/80 shadow-xs">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Trending Tag, Headline, Subtitle, Dual CTAs, Trust Proof */}
          <div className="space-y-6 lg:col-span-6 lg:pr-4 z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7e3d1c]/20 bg-[#7e3d1c]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#7e3d1c]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Trending Now</span>
            </div>

            <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.08]">
              Discover Products You'll Love
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-lg font-medium">
              Shop the latest handcrafted solid wood furniture, sacred idols, and artisanal decor
              curated for modern lifestyles.
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={currentSlide.link}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#7e3d1c] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#7e3d1c]/25 transition-all hover:bg-[#693116] hover:scale-105 active:scale-95"
              >
                <span>Shop Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-xs transition-all hover:bg-slate-100 hover:border-slate-400 active:scale-95"
              >
                Explore Collection
              </Link>
            </div>

            {/* Customer Trust Proof */}
            <div className="flex items-center gap-3 border-t border-slate-200/80 pt-6">
              <div className="flex -space-x-2 overflow-hidden">
                <span className="inline-block h-8 w-8 rounded-full bg-slate-300 ring-2 ring-white text-xs flex items-center justify-center font-bold text-slate-700">
                  R
                </span>
                <span className="inline-block h-8 w-8 rounded-full bg-amber-200 ring-2 ring-white text-xs flex items-center justify-center font-bold text-amber-800">
                  A
                </span>
                <span className="inline-block h-8 w-8 rounded-full bg-[#7e3d1c]/20 ring-2 ring-white text-xs flex items-center justify-center font-bold text-[#7e3d1c]">
                  M
                </span>
                <span className="inline-block h-8 w-8 rounded-full bg-emerald-200 ring-2 ring-white text-xs flex items-center justify-center font-bold text-emerald-800">
                  S
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Loved by 50,000+ customers worldwide
                </p>
              </div>
            </div>

            {/* Slide Navigation Dots */}
            {slides.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
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

          {/* Right Column: Hero Image with Floating Mini Product Cards */}
          <div className="relative flex justify-center lg:col-span-6">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border-4 border-white transition-all">
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

              {/* Floating Mini Product Card 1 (Top Left) */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-2.5 shadow-lg backdrop-blur-md">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=150&q=80"
                    alt="Accent Chair"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                    Nordic Chair
                  </div>
                  <div className="text-[11px] font-extrabold text-[#7e3d1c]">₹8,499</div>
                </div>
              </div>

              {/* Floating Mini Product Card 2 (Bottom Right) */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-2.5 shadow-lg backdrop-blur-md">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1582582621959-48d273528920?auto=format&fit=crop&w=150&q=80"
                    alt="Brass Diya"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                    Ganesha Idol
                  </div>
                  <div className="text-[11px] font-extrabold text-[#7e3d1c]">₹3,499</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
