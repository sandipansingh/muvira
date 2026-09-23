import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { Button } from '../ui/Button'
import { Dropdown, type DropdownOption } from '../ui/Dropdown'

const AUTO_ROTATE_INTERVAL = 6000

const SORT_DROPDOWN_OPTIONS: DropdownOption[] = [
  { value: '/shop?sort=newest', label: 'New Arrivals' },
  { value: '/shop?sort=featured', label: 'Featured' },
  { value: '/shop?sort=price_asc', label: 'Price: Low to High' },
  { value: '/shop?sort=price_desc', label: 'Price: High to Low' },
]

export const HeroSlider: React.FC = () => {
  const { settings, loading, error } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const navigate = useNavigate()

  const activeSlides = settings.heroSlides

  const nextSlide = useCallback(() => {
    if (activeSlides.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length)
  }, [activeSlides.length])

  const prevSlide = useCallback(() => {
    if (activeSlides.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)
  }, [activeSlides.length])

  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return undefined
    const timer = setInterval(nextSlide, AUTO_ROTATE_INTERVAL)
    return () => clearInterval(timer)
  }, [isPaused, nextSlide, activeSlides.length])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSearch.trim()) return
    navigate(`/shop?q=${encodeURIComponent(quickSearch.trim())}`)
  }

  if (loading) {
    return (
      <section className="layout-container py-2 sm:py-3" aria-busy="true">
        <div className="w-full h-[clamp(22rem,76dvh,52.5rem)] rounded-[2.5rem] lg:rounded-[3rem] animate-pulse bg-surface" />
      </section>
    )
  }

  if (error || activeSlides.length === 0) {
    return (
      <section className="layout-container py-2 sm:py-3">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-surface px-6 text-center lg:rounded-3xl">
          <h1 className="text-h1 text-ink">Explore Muvira</h1>
          <p className="mt-3 max-w-lg text-base text-ink">
            {error
              ? 'Storefront highlights are temporarily unavailable.'
              : 'Browse our current catalog.'}
          </p>
          <Link to="/shop" className="button-primary mt-6">
            Shop products
          </Link>
        </div>
      </section>
    )
  }

  const currentSlide = activeSlides[currentIndex] || activeSlides[0]

  return (
    <section
      id="home"
      className="layout-container py-2 sm:py-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero section"
    >
      {/* Sub-Header / Filter & Search Toolbar (Desktop Only) */}
      <div className="mb-3.5 sm:mb-4 hidden md:flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Dropdown
            placeholder="Sort products"
            value=""
            onChange={(val) => navigate(val)}
            options={SORT_DROPDOWN_OPTIONS}
            variant="slim"
            className="w-36"
          />
        </div>

        {/* Center Search Pill */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm min-w-[200px] relative">
          <input
            type="search"
            placeholder="search..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-paper py-1.5 pl-4 pr-8 text-base font-normal text-ink placeholder-muted outline-none shadow-xs transition-colors focus:border-line focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        <Link to="/categories" className="button-secondary h-8 px-3.5 text-xs">
          Categories
        </Link>
      </div>

      {/* Main Full-Image Hero Banner Container */}
      <div className="relative w-full h-[clamp(22rem,76dvh,52.5rem)] rounded-2xl lg:rounded-3xl overflow-hidden shadow-premium flex flex-col justify-end p-6 sm:p-10 lg:p-12 bg-ink">
        {/* Full-Bleed Slider Background Photo */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentSlide.id}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 z-0"
          >
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title || 'Hero Banner'}
              width={1600}
              height={900}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
            {/* Subtle Gradient to ensure bottom white text/buttons pop cleanly */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent z-10" />
          </motion.div>
        </AnimatePresence>

        {/* Top-Right Slider Navigation Controls */}
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={prevSlide}
            className="w-11 h-11 rounded-[var(--radius-control)] bg-white/80 hover:bg-white text-ink-soft backdrop-blur-md border border-white/40 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="w-11 h-11 rounded-[var(--radius-control)] bg-white/80 hover:bg-white text-ink-soft backdrop-blur-md border border-white/40 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Centered Bottom Action Buttons (Matching Reference Design) */}
        <div className="relative z-20 w-full flex flex-col items-center justify-center gap-2 mb-2 sm:mb-4">
          <div className="flex items-center gap-2">
            <Link to={currentSlide.link || '/shop'}>
              <Button
                variant="inverse"
                size="lg"
                className="px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-normal shadow-md hover:shadow-lg active:scale-98"
              >
                Start shopping
              </Button>
            </Link>
            <Link to={currentSlide.link || '/shop'} aria-label="Start shopping arrow">
              <Button
                variant="inverse"
                className="!h-11 !w-11 !p-0 shadow-md hover:shadow-lg active:scale-98 shrink-0"
              >
                <ArrowUpRight className="h-4.5 w-4.5 stroke-[2.5]" />
              </Button>
            </Link>
          </div>

          <Link
            to="/shop"
            className="inline-flex min-h-[var(--tap-target)] items-center text-base font-normal text-white drop-shadow-md hover:text-white/85 transition-colors cursor-pointer"
          >
            Top collections
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HeroSlider
