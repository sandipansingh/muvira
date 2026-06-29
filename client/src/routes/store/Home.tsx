import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productsApiService } from '../../lib/api/products'
import { categoriesApiService } from '../../lib/api/categories'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import type { Category } from '../../types/category'
import type { ProductListItem } from '../../types/product'
import ProductCard from '../../components/product/ProductCard'
import Skeleton from '../../components/ui/Skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const Home: React.FC = () => {
  const { settings } = useSiteSettings()
  const heroSlides = settings?.heroSlides ?? []
  const promoBanners = settings?.promoBanners ?? []
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<ProductListItem[]>([])

  const [loading, setLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)

  // Slide timer (8 seconds auto-rotation)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    fetchHomepageData()
  }, [])

  const fetchHomepageData = async () => {
    setLoading(true)
    const [catsRes, prodRes] = await Promise.all([
      categoriesApiService.getCategories(),
      productsApiService.getProducts({ sort: 'popularity', limit: 4 }),
    ])

    if (catsRes.success) setCategories(catsRes.data)
    if (prodRes.success) setFeatured(prodRes.data)
    setLoading(false)
  }

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length)
  }

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10 text-left space-y-12">
      {/* 1. HERO - left slider + right promo banners */}
      <div className="container-fluid mx-auto !px-0 md:pt-4 md:pb-7 flex flex-col md:flex-row justify-between gap-4 bg-transparent">
        {/* LEFT - Hero Slider (≈63%) */}
        <section className="relative w-full md:w-[63%] pb-5 md:py-0 mx-0 overflow-hidden md:rounded-lg">
          {heroSlides.length === 0 ? (
            <Skeleton className="w-full h-[300px] md:h-[470px] rounded-lg" />
          ) : (
            <>
              <div className="overflow-hidden w-full md:rounded-lg">
                <div
                  className="hero-track flex md:gap-4 md:rounded-lg transition-transform duration-500 ease-in-out"
                  style={{
                    '--slide-transform-mobile': `-${activeSlide * 100}%`,
                    '--slide-transform-desktop': `calc(-${activeSlide * 100}% - ${activeSlide * 16}px)`
                  } as React.CSSProperties}
                >
                  {heroSlides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="rounded border bg-card text-card-foreground w-full flex-none basis-full md:last:mr-4 border-none shadow-none"
                    >
                      <div className="p-0 my-0 mx-[10px] md:mx-0">
                        <Link
                          to={slide.link}
                          className="block rounded-lg md:h-[470px] md:min-h-[470px] cursor-pointer"
                        >
                          <img
                            alt="Online Furniture Shopping Website"
                            fetchPriority={idx === 0 ? 'high' : undefined}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            width="1440"
                            height="679"
                            decoding="async"
                            className="rounded-lg mx-auto md:mx-0 w-auto h-auto md:h-full md:w-full md:object-cover"
                            style={{ color: 'transparent' }}
                            src={slide.imageUrl}
                          />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePrevSlide}
                className="hidden md:flex items-center justify-center absolute bg-white/50 p-2 rounded-full left-2 top-1/2 -translate-y-1/2 transition-opacity hover:bg-white/80 z-20"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4 text-gray-800" />
              </button>
              <button
                onClick={handleNextSlide}
                className="hidden md:flex items-center justify-center absolute bg-white/50 p-2 rounded-full right-2 top-1/2 -translate-y-1/2 transition-opacity hover:bg-white/80 z-20"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4 text-gray-800" />
              </button>

              {/* Mobile pagination indicators */}
              <div className="md:hidden flex justify-center mt-4 gap-2">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className="relative h-1 w-5 bg-gray-300 rounded-full overflow-hidden"
                    style={{ width: '20px' }}
                  >
                    <span
                      className={`absolute left-0 top-0 h-full bg-[var(--accent)] transition-all duration-300 ${
                        activeSlide === idx ? 'w-full' : 'w-0'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* RIGHT - Promo Banners (≈37%) */}
        {promoBanners.length > 0 && (
          <section className="hidden md:flex flex-col justify-between w-[37%] gap-4">
            {promoBanners.slice(0, 2).map((banner) => (
              <div
                key={banner.id}
                className="rounded border bg-card text-card-foreground border-none shadow-none"
              >
                <div className="p-0">
                  <Link to={banner.link} className="rounded-lg block cursor-pointer">
                    <img
                      src={banner.imageUrl}
                      alt="Online Furniture Promotion"
                      loading="eager"
                      width="552"
                      height="592"
                      decoding="async"
                      className="object-cover rounded-lg mx-auto w-auto h-auto md:h-[227px] md:w-full"
                      style={{ color: 'transparent' }}
                    />
                  </Link>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* 3. CATEGORIES - distinctive presentation */}
      <div className="space-y-6 ">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase text-[10px] tracking-[2px] text-[var(--accent)] font-medium mb-1">
              Curated Collections
            </div>
            <h2 className="text-[26px] md:text-[30px] tracking-[-0.01em] leading-none font-medium font-redhatMedium text-[var(--text)]">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/categories"
            className="hidden md:inline text-xs font-semibold tracking-[1.5px] uppercase text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[176px] rounded-xl" />
              ))
            : categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  className="group relative h-[172px] rounded-xl overflow-hidden border border-[var(--border)] block"
                >
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                  {/* Layered overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#2c2724]/85 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <div className="text-[11px] font-medium tracking-[2px] text-[var(--accent-gold-light)] mb-1.5">
                      COLLECTION
                    </div>
                    <h4 className="text-[17px] font-medium tracking-[-0.2px] leading-[1.05] font-redhatMedium">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* 5. FEATURED BEST SELLERS - elevated product presentation */}
      <div className="space-y-6 ">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase tracking-[2px] text-[10px] text-[var(--accent)] font-medium mb-1">
              Editor’s Picks
            </div>
            <h2 className="text-[26px] md:text-[30px] tracking-[-0.01em] font-medium text-[var(--text)] font-redhatMedium">
              Featured Best Sellers
            </h2>
          </div>
          <Link
            to="/products"
            className="hidden md:block text-xs uppercase tracking-[1.5px] font-semibold text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors"
          >
            Discover All →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface)]"
                >
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <div className="pt-4 space-y-2.5">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            : featured.map((prod) => <ProductCard key={prod.id} product={prod} />)}
        </div>
      </div>

      {/* 6. ALSO AVAILABLE AT */}
      <div className="pt-6 pb-8 border-t border-[var(--border)]">
        <div className="text-center mb-4">
          <div className="uppercase text-[10px] tracking-[2.5px] font-medium text-[var(--text-muted)] mb-3">
            Also available at
          </div>

          <div className="flex justify-center items-center gap-8 md:gap-14">
            <a href="https://amazon.in" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-white p-3 rounded-3xl border border-[var(--border)]">
                <img
                  src="/amazon.webp"
                  alt="Amazon"
                  className="h-10 md:h-12 w-auto object-contain rounded-2xl grayscale-[0.3] group-hover:grayscale-0 transition-all"
                />
              </div>
            </a>
            <a
              href="https://flipkart.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="bg-white p-3 rounded-3xl border border-[var(--border)]">
                <img
                  src="/flipkart.webp"
                  alt="Flipkart"
                  className="h-10 md:h-12 w-auto object-contain rounded-2xl grayscale-[0.3] group-hover:grayscale-0 transition-all"
                />
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
