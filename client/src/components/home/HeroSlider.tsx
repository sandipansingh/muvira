import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const AUTO_ROTATE_INTERVAL = 6000

export const HeroSlider: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const navigate = useNavigate()
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSearch.trim()) return
    navigate(`/shop?q=${encodeURIComponent(quickSearch.trim())}`)
  }

  if (loading) {
    return (
      <section className="layout-container py-4 lg:py-6" aria-busy="true">
        <div className="w-full h-[480px] sm:h-[580px] lg:h-[75vh] rounded-[2.5rem] animate-pulse bg-neutral-100" />
      </section>
    )
  }

  if (slides.length === 0) return null

  const currentSlide = slides[currentIndex]

  return (
    <section
      id="home"
      className="layout-container py-2 sm:py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero slider"
    >
      {/* Top Quick Category & Search Toolbar (Matches user reference Image 2) */}
      <div className="mb-3.5 hidden md:flex items-center justify-between gap-3 text-xs">
        {/* Left Dropdown Selectors */}
        <div className="flex items-center gap-2">
          <Link
            to="/shop"
            className="flex items-center gap-1.5 rounded-full border border-border-light bg-white px-3.5 py-1.5 font-semibold text-foreground hover:bg-neutral-50 transition-colors shadow-xs"
          >
            <span>Collections</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
          <Link
            to="/shop?sort=newest"
            className="flex items-center gap-1.5 rounded-full border border-border-light bg-white px-3.5 py-1.5 font-semibold text-foreground hover:bg-neutral-50 transition-colors shadow-xs"
          >
            <span>New In</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
        </div>

        {/* Center Search Pill */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs relative">
          <input
            type="search"
            placeholder="Search timber furniture..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full rounded-full border border-border-light bg-white py-1.5 pl-3.5 pr-8 text-xs font-medium text-foreground placeholder-neutral-400 outline-none focus:border-neutral-400 shadow-xs"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Right Category Filter Pills */}
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Living', to: '/shop?category=living-room' },
            { label: 'Bedroom', to: '/shop?category=bedroom' },
            { label: 'Dining', to: '/shop?category=dining' },
            { label: 'All Pieces', to: '/shop' },
          ].map((cat) => (
            <Link
              key={cat.label}
              to={cat.to}
              className="rounded-full border border-border-light bg-white px-3.5 py-1.5 font-semibold text-foreground hover:border-neutral-400 hover:bg-neutral-50 transition-all shadow-xs"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Curved Hero Banner (Image 2 layout) */}
      <div className="relative w-full h-[500px] sm:h-[580px] lg:h-[78vh] min-h-[480px] rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden bg-neutral-900 shadow-premium">
        {/* Background Image Carousel with Fade Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.02 }}
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10 hidden sm:block" />
          </motion.div>
        </AnimatePresence>

        {/* Foreground Content */}
        <div className="relative z-20 h-full flex flex-col justify-end p-6 sm:p-10 lg:p-14 max-w-3xl">
          <motion.div
            key={`content-${currentSlide.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white border border-white/25 mb-3 sm:mb-4 select-none shadow-xs">
              Muvira Handcrafted
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08] drop-shadow-sm font-display">
              {currentSlide.title}
            </h1>

            {currentSlide.subtitle && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm lg:text-base text-white/90 font-normal leading-relaxed max-w-xl drop-shadow-sm">
                {currentSlide.subtitle}
              </p>
            )}

            {/* Pill CTA Button (Image 2 style: "Start shopping ↗") */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={currentSlide.link || '/shop'}
                className="group inline-flex items-center gap-3 rounded-full bg-white pl-6 pr-2 py-2 text-sm font-bold text-neutral-900 transition-all hover:bg-neutral-100 hover:shadow-lg active:scale-98 cursor-pointer"
              >
                <span>Start Shopping</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Navigation Arrow Controls (Top-Right or Bottom-Right) */}
        {slides.length > 1 && (
          <div className="absolute right-6 bottom-6 sm:right-10 sm:bottom-10 lg:right-14 lg:bottom-14 z-30 flex items-center gap-2.5">
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
      </div>
    </section>
  )
}

export default HeroSlider
