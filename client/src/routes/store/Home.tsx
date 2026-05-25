import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { campaignsApiService } from "../../lib/api/campaigns";
import { productsApiService } from "../../lib/api/products";
import { categoriesApiService } from "../../lib/api/categories";
import type { Category } from "../../types/category";
import type { ProductListItem } from "../../types/product";
import type { Campaign } from "../../types/campaign";
import ProductCard from "../../components/product/ProductCard";
import Skeleton from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Award,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductListItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Hero slides data
  const heroSlides = [
    {
      id: 1,
      title: "Festival Furniture Bonanza",
      subtitle: "Up to 30% Off Sheesham Wood Craftsmanship",
      imageUrl:
        "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&auto=format&fit=crop&q=80",
      link: "/categories/solid-wood-furniture",
    },
    {
      id: 2,
      title: "Handloom apparel & Kurtas",
      subtitle: "Organic block-print cotton kurtas from Jaipur weavers",
      imageUrl:
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
      link: "/categories/kurtas-apparel",
    },
    {
      id: 3,
      title: "Bespoke cushions & rugs",
      subtitle: "Jaipur vegetable dye home coordinates to match your sofas",
      imageUrl:
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=1200&auto=format&fit=crop&q=80",
      link: "/categories/home-decor",
    },
  ];

  useEffect(() => {
    fetchHomepageData();
  }, []);

  // Slide timer (8 seconds auto-rotation)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const fetchHomepageData = async () => {
    setLoading(true);
    const [catsRes, prodRes, campRes] = await Promise.all([
      categoriesApiService.getCategories(),
      productsApiService.getProducts({ sort: "popularity", limit: 4 }),
      campaignsApiService.getActiveCampaigns(),
    ]);

    if (catsRes.success) setCategories(catsRes.data);
    if (prodRes.success) setFeatured(prodRes.data);
    if (campRes.success) setCampaigns(campRes.data);
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
    <div className="max-w-[1240px] mx-auto px-6 py-10 font-instrument text-left space-y-16">
      {/* 1. HERO BANNER SECTION — elevated with rich typography and atmosphere */}
      <div className="flex flex-col md:flex-row gap-4 h-[370px] md:h-[510px] animate-stagger stagger-1">
        {/* Left Slider: 63% */}
        <div className="flex-1 md:flex-[0.63] bg-[#f4ede3] rounded-2xl overflow-hidden relative group border border-[var(--border)] shadow-sm">
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
              {/* Rich atmospheric overlay — deeper, more sophisticated */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#2c2724]/80 via-[#2c2724]/45 to-[#2c2724]/10 flex flex-col justify-end p-7 md:p-14 text-left text-white">
                <div className="mb-3">
                  <span className="inline-block bg-[var(--accent)] text-white text-[10px] font-semibold tracking-[2px] px-3 py-px rounded-sm uppercase">
                    Festival Edit
                  </span>
                </div>

                <h1 className="text-[29px] md:text-[44px] leading-[1.05] font-medium tracking-[-0.015em] mb-3.5 font-playfair max-w-[28ch]">
                  {slide.title}
                </h1>
                <p className="text-[13px] md:text-[15px] text-[#e8e0d4] tracking-wide font-light max-w-[38ch] mb-8">
                  {slide.subtitle}
                </p>

                <Button
                  variant="primary"
                  onClick={() => navigate(slide.link)}
                  className="self-start text-sm px-7 py-2.5 tracking-wide"
                >
                  Shop the Collection
                </Button>
              </div>
            </div>
          ))}

          {/* Navigation arrows */}
          <button
            onClick={handlePrevSlide}
            className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white p-2.5 rounded-full z-20 text-[var(--text)] transition-all focus:outline-none hidden md:block hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white p-2.5 rounded-full z-20 text-[var(--text)] transition-all focus:outline-none hidden md:block hover:scale-105"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Refined slide indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-[3px] rounded-full overflow-hidden transition-all duration-300 ${
                  activeSlide === idx ? "w-9 bg-[var(--accent)]" : "w-4 bg-white/50"
                }`}
              >
                {activeSlide === idx && (
                  <div className="h-full bg-[var(--accent-gold)] progress-fill" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Stacked Promos — richer, more atmospheric */}
        <div className="hidden md:flex md:flex-[0.37] flex-col gap-4">
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-[var(--border)] flex flex-col justify-end p-7 bg-gradient-to-br from-[#f4ede3] via-[#f4ede3] to-[#e9e0d3]">
            <div className="absolute inset-0 pattern-block" />
            <div className="relative">
              <div className="uppercase tracking-[2.5px] text-[10px] font-semibold text-[var(--accent)] mb-2.5">Organic Coordinates</div>
              <h3 className="text-[22px] leading-[1.1] font-medium text-[var(--text)] tracking-[-0.01em] font-playfair mb-5">
                Blockprinted Cushions<br /> &amp; Bedspreads
              </h3>
              <Link
                to="/categories/home-decor"
                className="inline-flex text-[12px] font-semibold tracking-widest text-[var(--accent)] hover:text-[var(--accent-dark)] items-center gap-1 transition-colors group"
              >
                EXPLORE CUSHION COVERS <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>

          <div className="flex-1 relative rounded-2xl overflow-hidden border border-[var(--border)] flex flex-col justify-end p-7 bg-gradient-to-br from-[#2c2724] to-[#3a322d] text-[#e8e0d4]">
            <div className="relative">
              <div className="uppercase tracking-[2.5px] text-[10px] font-semibold text-[var(--accent-gold-light)] mb-2.5">Classic Living</div>
              <h3 className="text-[22px] leading-[1.1] font-medium text-white tracking-[-0.01em] font-playfair mb-5">
                Sheesham Wood Coffee<br />Tables &amp; Sofas
              </h3>
              <Link
                to="/categories/solid-wood-furniture"
                className="inline-flex text-[12px] font-semibold tracking-widest text-[var(--accent-gold-light)] hover:text-white items-center gap-1 transition-colors group"
              >
                SHOP SOLID WOOD <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. USP TRUST SIGNALS — refined with atmosphere and sharp accent icons */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-2xl py-7 px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-7 text-left select-none animate-stagger stagger-2">
        {[
          { icon: Truck, title: "Free Shipping", desc: "Complimentary courier delivery across India" },
          { icon: Award, title: "Premium Craftsmanship", desc: "Seasoned Sheesham & traditional loom techniques" },
          { icon: ShieldAlert, title: "Secure Payments", desc: "Razorpay-protected checkout on every order" },
          { icon: Sparkles, title: "Jaipur Block-Prints", desc: "Hand blockprinted with organic vegetable dyes" },
        ].map((item, index) => (
          <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-3.5 group">
            <div className="shrink-0 text-[var(--accent)]">
              <item.icon className="w-9 h-9" />
            </div>
            <div>
              <h5 className="text-[13px] font-semibold tracking-[0.3px] text-[var(--text)]">
                {item.title}
              </h5>
              <p className="text-[11.5px] text-[var(--text-muted)] leading-snug tracking-wide mt-px">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. CATEGORIES — distinctive presentation */}
      <div className="space-y-6 animate-stagger stagger-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase text-[10px] tracking-[2px] text-[var(--accent)] font-medium mb-1">Curated Collections</div>
            <h2 className="text-[26px] md:text-[30px] tracking-[-0.01em] leading-none font-medium font-playfair text-[var(--text)]">
              Shop by Room &amp; Category
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
                <Skeleton key={i} className="h-[176px] rounded-2xl" />
              ))
            : categories.slice(0, 4).map((cat, index) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  className={`group relative h-[172px] rounded-2xl overflow-hidden border border-[var(--border)] block hover-lift animate-stagger stagger-${Math.min(index + 4, 8)}`}
                >
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-all duration-[650ms] group-hover:scale-[1.07]"
                  />
                  {/* Layered overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#2c2724]/85 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <div className="text-[11px] font-medium tracking-[2px] text-[var(--accent-gold-light)] mb-1.5">COLLECTION</div>
                    <h4 className="text-[17px] font-medium tracking-[-0.2px] leading-[1.05] font-playfair">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* 4. LIMITED EDITION CAMPAIGN — heritage dominant palette */}
      {campaigns.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--text)] text-[#f1e9de] px-8 md:px-12 py-9 md:py-11 flex flex-col md:flex-row md:items-center gap-8 animate-stagger stagger-4">
          {/* Subtle geometric atmosphere */}
          <div className="absolute inset-0 pattern-block opacity-10" />

          <div className="relative max-w-xl">
            <div className="flex items-center gap-2 text-[10px] tracking-[3px] uppercase font-medium text-[var(--accent-gold-light)] mb-3">
              <span className="inline-block w-px h-3.5 bg-[var(--accent-gold)]" /> LIMITED OFFER
            </div>
            <h2 className="font-playfair text-[26px] md:text-[34px] leading-none tracking-[-0.4px] mb-4 text-white">
              {campaigns[0].name}
            </h2>
            <p className="text-[13px] leading-relaxed tracking-wide text-[#d9cebf]">
              {campaigns[0].description} Use code{" "}
              <span className="font-medium text-[var(--accent-gold-light)] tracking-[1px]">DIWALI20</span> at checkout for 20% off.
            </p>
          </div>

          <div className="md:ml-auto">
            <Button
              variant="primary"
              onClick={() => navigate("/products")}
              className="w-full md:w-auto px-9 py-3 text-base tracking-[0.5px] border-0 bg-[var(--accent)] hover:bg-[var(--accent-dark)]"
            >
              Shop the Sale
            </Button>
          </div>
        </div>
      )}

      {/* 5. FEATURED BEST SELLERS — elevated product presentation */}
      <div className="space-y-6 animate-stagger stagger-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="uppercase tracking-[2px] text-[10px] text-[var(--accent)] font-medium mb-1">Editor’s Picks</div>
            <h2 className="text-[26px] md:text-[30px] tracking-[-0.01em] font-medium text-[var(--text)] font-playfair">Featured Best Sellers</h2>
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
                <div key={i} className="rounded-2xl border border-[var(--border)] p-3 bg-[var(--surface)]">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <div className="pt-4 space-y-2.5">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            : featured.map((prod, idx) => (
                <div key={prod.id} className={`animate-stagger stagger-${Math.min(idx + 6, 8)}`}>
                  <ProductCard product={prod} />
                </div>
              ))}
        </div>
      </div>

      {/* 6. ALSO AVAILABLE AT — refined, atmospheric treatment */}
      <div className="pt-4 pb-6 border-t border-[var(--border)]">
        <div className="text-center mb-8">
          <div className="uppercase text-[10px] tracking-[2.5px] font-medium text-[var(--text-muted)]">Also available at</div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-9 opacity-90">
          <a
            href="https://amazon.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center group"
          >
            <img src="/amazon.webp" alt="Amazon" className="h-9 md:h-[46px] w-auto object-contain transition-all group-hover:opacity-80" />
            <span className="mt-3 text-[10px] tracking-[3px] uppercase font-medium text-[var(--text-muted)] flex items-center gap-1.5">
              <span className="h-px w-4 bg-[var(--accent-gold)]" /> LIVE ON AMAZON
            </span>
          </a>

          <a
            href="https://flipkart.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center group"
          >
            <img src="/flipkart.webp" alt="Flipkart" className="h-9 md:h-[46px] w-auto object-contain transition-all group-hover:opacity-80" />
            <span className="mt-3 text-[10px] tracking-[3px] uppercase font-medium text-[var(--text-muted)] flex items-center gap-1.5">
              <span className="h-px w-4 bg-[var(--accent-gold)]" /> LIVE ON FLIPKART
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Home;
