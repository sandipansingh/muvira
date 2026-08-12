import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const AUTO_ROTATE_INTERVAL = 6000

const FALLBACK_SLIDES = [
  {
    id: '1',
    title: 'We are digital meets fashions',
    subtitle:
      'Show your store pride, get high-quality handcrafted timber pieces directly from our master artisan foundation.',
    imageUrl:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80',
    link: '/shop',
  },
  {
    id: '2',
    title: 'Crafted for timeless living',
    subtitle:
      'Transforming your sanctuary into stylish and functional spaces with heirloom grade natural wood.',
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=80',
    link: '/shop?category=living-room',
  },
]

const CATEGORY_DROPDOWN_OPTIONS = [
  { label: 'All Collections', href: '/shop' },
  { label: 'Living Room', href: '/shop?category=living-room' },
  { label: 'Bedroom Furniture', href: '/shop?category=bedroom' },
  { label: 'Dining & Kitchen', href: '/shop?category=dining' },
  { label: 'Office & Decor', href: '/shop?category=office-decor' },
]

const SORT_DROPDOWN_OPTIONS = [
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?sort=popularity' },
  { label: 'Price: Low to High', href: '/shop?sort=price_asc' },
  { label: 'Price: High to Low', href: '/shop?sort=price_desc' },
]

const QUICK_CATEGORY_PILLS = [
  { label: 'Men', href: '/shop?category=living-room' },
  { label: 'Women', href: '/shop?category=bedroom' },
  { label: 'Children', href: '/shop?category=dining' },
  { label: 'Brand', href: '/shop' },
]

export const HeroSlider: React.FC = () => {
  const { settings, loading } = useSiteSettings()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const navigate = useNavigate()

  const categoriesRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const activeSlides =
    settings.heroSlides && settings.heroSlides.length > 0 ? settings.heroSlides : FALLBACK_SLIDES

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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setIsCategoriesOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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

  const currentSlide = activeSlides[currentIndex] || activeSlides[0]

  return (
    <section
      id="home"
      className="layout-container py-2 sm:py-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero section"
    >
      {/* Sub-Header / Filter & Search Toolbar (Matches off.vstore reference) */}
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap text-xs">
        {/* Left Dropdown Selectors */}
        <div className="flex items-center gap-2">
          {/* Categories Dropdown */}
          <div ref={categoriesRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsCategoriesOpen((prev) => !prev)
                setIsSortOpen(false)
              }}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 transition-all shadow-xs cursor-pointer"
            >
              <span>Categories</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                  isCategoriesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isCategoriesOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-premium z-50 animate-in fade-in zoom-in-95 duration-150">
                {CATEGORY_DROPDOWN_OPTIONS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsCategoriesOpen(false)}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* New Product Dropdown */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev)
                setIsCategoriesOpen(false)
              }}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 transition-all shadow-xs cursor-pointer"
            >
              <span>New Product</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                  isSortOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-premium z-50 animate-in fade-in zoom-in-95 duration-150">
                {SORT_DROPDOWN_OPTIONS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsSortOpen(false)}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Search Pill */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm min-w-[200px] relative">
          <input
            type="search"
            placeholder="search..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full rounded-full border border-neutral-200 bg-white py-1.5 pl-4 pr-8 text-xs font-medium text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 shadow-xs transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Right Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {QUICK_CATEGORY_PILLS.map((pill) => (
            <Link
              key={pill.label}
              to={pill.href}
              className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 font-medium text-neutral-700 hover:border-neutral-400 hover:text-neutral-950 hover:bg-neutral-50 transition-all shadow-xs shrink-0"
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Curved Hero Banner (Matches off.vstore layout reference) */}
      <div className="relative w-full min-h-[500px] sm:min-h-[560px] lg:h-[75vh] max-h-[740px] rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden bg-[#E2DCD4] shadow-premium flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Background Watermark Typography */}
        <div className="absolute left-6 sm:left-12 bottom-6 sm:bottom-8 z-0 pointer-events-none select-none text-white/40 sm:text-white/45 font-display font-black text-5xl sm:text-8xl lg:text-[130px] tracking-[0.2em] uppercase leading-none">
          LUXURIOUS
        </div>

        {/* Top-Right Slider Navigation Controls */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={prevSlide}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 hover:bg-white text-neutral-800 border border-neutral-200/80 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 hover:bg-white text-neutral-800 border border-neutral-200/80 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Architectural Circular / Arch Cutout Window Framing the Slide Image */}
        <div className="absolute top-1/2 -translate-y-1/2 right-6 sm:right-10 lg:right-20 z-10 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] lg:w-[460px] lg:h-[460px] rounded-full overflow-hidden border-[8px] sm:border-[12px] border-white/50 shadow-2xl bg-neutral-300 relative pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide.id}
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Full-Bleed Background for small screens */}
        <div className="absolute inset-0 sm:hidden z-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide.id}
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Left Side Content */}
        <div className="relative z-20 max-w-xl flex-1 flex flex-col justify-center">
          <motion.div
            key={`text-${currentSlide.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.08] font-display">
              {currentSlide.title}
            </h1>

            {currentSlide.subtitle && (
              <div className="mt-3.5 sm:mt-5 text-xs sm:text-sm text-neutral-700 font-normal leading-relaxed max-w-md flex items-start gap-2">
                <ArrowDownRight className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                <span>{currentSlide.subtitle}</span>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-6 sm:mt-8 flex items-center gap-4">
              <Link
                to={currentSlide.link || '/shop'}
                className="group inline-flex items-center gap-3 rounded-full bg-white pl-5 pr-2 py-2 text-xs sm:text-sm font-bold text-neutral-900 transition-all hover:bg-neutral-50 hover:shadow-md active:scale-98 cursor-pointer shadow-xs border border-neutral-100"
              >
                <span>Start shopping</span>
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>

              <Link
                to="/shop"
                className="text-xs sm:text-sm font-semibold text-neutral-800 hover:text-neutral-950 underline underline-offset-4 transition-colors cursor-pointer"
              >
                Top collections
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right-Side Sub-Badge Text (Matches off.vstore) */}
        <div className="hidden lg:block absolute right-12 bottom-10 z-20 max-w-[220px] text-right pointer-events-none select-none">
          <p className="text-xs text-neutral-600 font-medium leading-relaxed">
            Transforming into stylish &amp; functional pieces
          </p>
        </div>
      </div>
    </section>
  )
}

export default HeroSlider
