import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productsApiService } from "../../lib/api/products";
import { categoriesApiService } from "../../lib/api/categories";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import type { Category } from "../../types/category";
import type { ProductListItem } from "../../types/product";
import ProductCard from "../../components/product/ProductCard";
import Skeleton from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const heroSlides = settings?.heroSlides ?? [];
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Slide timer (8 seconds auto-rotation)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    fetchHomepageData();
  }, []);

  const fetchHomepageData = async () => {
    setLoading(true);
    const [catsRes, prodRes] = await Promise.all([
      categoriesApiService.getCategories(),
      productsApiService.getProducts({ sort: "popularity", limit: 4 }),
    ]);

    if (catsRes.success) setCategories(catsRes.data);
    if (prodRes.success) setFeatured(prodRes.data);
    setLoading(false);
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10 text-left space-y-12">
      {/* 1. HERO — clean, single focused message */}
      <div className="relative h-[400px] md:h-[460px] rounded-xl overflow-hidden border border-[var(--border)]">
        {heroSlides.length === 0 ? (
          // Skeleton while settings are loading / no slides configured
          <Skeleton className="w-full h-full rounded-xl" />
        ) : (
          <>
            {heroSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  activeSlide === idx ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[#2c2724]/60 flex items-center">
                  <div className="max-w-[620px] px-8 md:px-14">
                    <h1 className="text-white text-[34px] md:text-[48px] leading-[1.05] font-medium tracking-[-0.02em] mb-4 font-redhatMedium">
                      {slide.title}
                    </h1>
                    <p className="text-[#e8e0d4] text-[15px] md:text-[17px] tracking-wide mb-8 max-w-[36ch]">
                      {slide.subtitle}
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      className="font-pangramBold tracking-wide"
                      onClick={() => navigate(slide.link)}
                    >
                      Shop the Collection
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full z-20 hidden md:block transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full z-20 hidden md:block transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1 rounded-full transition-all ${activeSlide === idx ? 'w-5 bg-[var(--accent)]' : 'w-1.5 bg-white/60'}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. CATEGORIES — distinctive presentation */}
      <div className="space-y-6 ">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase text-[10px] tracking-[2px] text-[var(--accent)] font-medium mb-1">Curated Collections</div>
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
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Layered overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#2c2724]/85 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <div className="text-[11px] font-medium tracking-[2px] text-[var(--accent-gold-light)] mb-1.5">COLLECTION</div>
                    <h4 className="text-[17px] font-medium tracking-[-0.2px] leading-[1.05] font-redhatMedium">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              ))}
        </div>
      </div>



      {/* 5. FEATURED BEST SELLERS — elevated product presentation */}
      <div className="space-y-6 ">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase tracking-[2px] text-[10px] text-[var(--accent)] font-medium mb-1">Editor’s Picks</div>
            <h2 className="text-[26px] md:text-[30px] tracking-[-0.01em] font-medium text-[var(--text)] font-redhatMedium">Featured Best Sellers</h2>
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
                <div key={i} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface)]">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <div className="pt-4 space-y-2.5">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            : featured.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
        </div>
      </div>

      {/* 6. ALSO AVAILABLE AT */}
      <div className="pt-6 pb-8 border-t border-[var(--border)]">
        <div className="text-center mb-4">
          <div className="uppercase text-[10px] tracking-[2.5px] font-medium text-[var(--text-muted)] mb-3">
            Also available at
          </div>

          <div className="flex justify-center items-center gap-8 md:gap-14">
            <a
              href="https://amazon.in"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
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
  );
};

export default Home;
