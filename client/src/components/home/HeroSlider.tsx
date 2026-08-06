import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { MOCK_HERO_SLIDES } from '../../mock/mockData'

export const HeroSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % MOCK_HERO_SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + MOCK_HERO_SLIDES.length) % MOCK_HERO_SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">
        {/* High-impact rounded hero image slider container */}
        <div className="relative w-full h-[380px] sm:h-[480px] md:h-[560px] lg:h-[620px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-zinc-200/60 group">
          {/* Slides Track */}
          {MOCK_HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.alt}
                className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          ))}

          {/* Subtlest gradient at bottom left to ensure white pill button contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-15 pointer-events-none" />

          {/* Top-Right Pagination Dots Indicator (Matching AuraLine Reference Design 1) */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            {MOCK_HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Floating Prev/Next Controls (visible on hover) */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/70 hover:bg-white text-zinc-900 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/70 hover:bg-white text-zinc-900 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Strictly NO TEXT OVERLAY inside image — ONLY the floating "Shop Now →" Pill Button */}
          <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 z-20">
            <Link
              to={MOCK_HERO_SLIDES[currentIndex].link}
              className="inline-flex items-center gap-2 bg-white/95 hover:bg-white text-zinc-900 font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-white/40"
            >
              Shop Now
              <ArrowRight className="w-4 h-4 text-[#C88D35]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
