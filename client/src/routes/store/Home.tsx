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
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-redhat text-left space-y-12">
      {/* 1. HERO BANNER SECTION (Desktop split vs Mobile full width) */}
      <div className="flex flex-col md:flex-row gap-4 h-[350px] md:h-[470px]">
        {/* Left Slider: 63% basis */}
        <div className="flex-1 md:flex-[0.63] bg-lightgrayColor rounded-xl overflow-hidden relative group border border-secondary200">
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-12 text-left text-white">
                <span className="bg-primaryBg text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 self-start">
                  Festival Sale
                </span>
                <h2 className="text-xl md:text-3xl font-bold tracking-wide mb-2 leading-tight font-montserrat">
                  {slide.title}
                </h2>
                <p className="text-xs md:text-sm text-[#E7E7E7] font-medium tracking-wide mb-6">
                  {slide.subtitle}
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(slide.link)}
                  className="self-start text-xs md:text-sm py-2 px-5"
                >
                  Shop the Collection
                </Button>
              </div>
            </div>
          ))}

          {/* Left/Right navigation arrows (Desktop only) */}
          <button
            onClick={handlePrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 p-2 rounded-full z-20 text-darkColor transition-colors focus:outline-none hidden md:block"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/60 hover:bg-white/80 p-2 rounded-full z-20 text-darkColor transition-colors focus:outline-none hidden md:block"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide dots with progress animation */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full overflow-hidden transition-all duration-300 ${
                  activeSlide === idx ? "w-8 bg-primaryBg" : "w-4 bg-white/60"
                }`}
              >
                {activeSlide === idx && (
                  <div className="h-full bg-primaryHover progress-fill" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Stacked Promo Banners: 37% basis (Hidden on mobile) */}
        <div className="hidden md:flex md:flex-[0.37] flex-col gap-4">
          <div className="flex-1 bg-[#FAE9E6] border border-primary200 rounded-xl overflow-hidden relative flex flex-col justify-end p-6 text-left">
            <h3 className="text-sm font-bold text-primaryBg uppercase tracking-widest mb-1.5">
              Organic Coordinates
            </h3>
            <h4 className="text-lg font-bold text-darkColor leading-snug mb-3 font-montserrat">
              Blockprinted Cushions & Bedspreads
            </h4>
            <Link
              to="/categories/home-decor"
              className="text-xs font-bold text-primaryBg hover:text-primaryHover"
            >
              Explore Cushion Covers →
            </Link>
          </div>
          <div className="flex-1 bg-lightgrayColor border border-secondary200 rounded-xl overflow-hidden relative flex flex-col justify-end p-6 text-left">
            <h3 className="text-sm font-bold text-secondary700 uppercase tracking-widest mb-1.5">
              Classic Living
            </h3>
            <h4 className="text-lg font-bold text-darkColor leading-snug mb-3 font-montserrat">
              Sheesham Wood Coffee Tables & Sofas
            </h4>
            <Link
              to="/categories/solid-wood-furniture"
              className="text-xs font-bold text-primaryBg hover:text-primaryHover"
            >
              Shop Solid Wood →
            </Link>
          </div>
        </div>
      </div>

      {/* 2. USP TRUST SIGNALS BAR */}
      <div className="bg-[#F5F5F5] border border-secondary200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left select-none">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <Truck className="w-10 h-10 text-primaryBg shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-darkColor tracking-wide">
              Free Shipping
            </h5>
            <p className="text-[11px] text-secondary600 tracking-wide mt-0.5 leading-snug">
              Free courier delivery on all orders across India
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <Award className="w-10 h-10 text-primaryBg shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-darkColor tracking-wide">
              Premium Craftsmanship
            </h5>
            <p className="text-[11px] text-secondary600 tracking-wide mt-0.5 leading-snug">
              Handcrafted in seasoned wood and traditional loom techniques
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <ShieldAlert className="w-10 h-10 text-primaryBg shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-darkColor tracking-wide">
              Secure Payments
            </h5>
            <p className="text-[11px] text-secondary600 tracking-wide mt-0.5 leading-snug">
              Secured Razorpay sandbox API checkout integrations
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <Sparkles className="w-10 h-10 text-primaryBg shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-darkColor tracking-wide">
              Jaipur Block-Prints
            </h5>
            <p className="text-[11px] text-secondary600 tracking-wide mt-0.5 leading-snug">
              Authentic hand blockprinted coordinates dyed organically
            </p>
          </div>
        </div>
      </div>

      {/* 3. CATEGORIES TABS/GRID SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-secondary200 pb-3">
          <div>
            <h2 className="text-lg md:text-2xl font-semibold tracking-wide text-darkColor font-montserrat">
              Shop by Room & Category
            </h2>
            <p className="text-xs md:text-sm text-secondary600 tracking-wide mt-1">
              Find premium coordinates tailored for every lifestyle context
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs font-bold text-primaryBg hover:text-primaryHover uppercase tracking-wider hover:underline"
          >
            All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))
            : categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  className="group relative h-40 rounded-xl overflow-hidden border border-secondary200 shadow-xs block"
                >
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-colors" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h4 className="text-sm font-bold uppercase tracking-wider leading-none">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* 4. FESTIVAL SALE BANNER (Pink promo background) */}
      {campaigns.length > 0 && (
        <div className="bg-[#FFF2F2] border border-[#f5dedd] rounded-xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-2 max-w-xl">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 font-montserrat">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              Limited Time Coupon Alert
            </span>
            <h2 className="text-xl md:text-3xl font-bold text-rose-950 tracking-wide font-montserrat">
              {campaigns[0].name}
            </h2>
            <p className="text-xs md:text-sm text-rose-800 leading-relaxed tracking-wide">
              {campaigns[0].description} Apply coupon code{" "}
              <b className="bg-rose-200/50 px-1.5 py-0.5 rounded text-rose-950 font-bold font-roboto">
                DIWALI20
              </b>{" "}
              during checkout to get 20% off items.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => navigate("/products")}
            className="w-full md:w-auto px-6 py-3"
          >
            Explore Sale Catalog
          </Button>
        </div>
      )}

      {/* 5. BEST SELLERS / FEATURED PRODUCTS */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-secondary200 pb-3">
          <div>
            <h2 className="text-lg md:text-2xl font-semibold tracking-wide text-darkColor font-montserrat">
              Featured Best Sellers
            </h2>
            <p className="text-xs md:text-sm text-secondary600 tracking-wide mt-1">
              Top rated designs preferred by Indian homes
            </p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-primaryBg hover:text-primaryHover uppercase tracking-wider hover:underline"
          >
            View All Designs →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2.5 p-2 bg-white border border-secondary200 rounded-lg"
                >
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            : featured.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
        </div>
      </div>

      {/* 6. ALSO AVAILABLE AT SECTION */}
      <div className="border-t border-secondary200 pt-10 pb-8 text-center space-y-6">
        <h3 className="text-sm md:text-base font-semibold uppercase tracking-wider text-secondary600 font-montserrat">
          We are also available at
        </h3>
        <div className="flex justify-center items-center gap-16 md:gap-24">
          {/* Amazon Logo */}
          <a
            href="https://amazon.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 focus:outline-none"
          >
            <img
              src="/amazon.webp"
              alt="Amazon"
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Live
            </span>
          </a>

          {/* Flipkart Logo */}
          <a
            href="https://flipkart.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 focus:outline-none"
          >
            <img
              src="/flipkart.webp"
              alt="Flipkart"
              className="h-10 md:h-12 w-auto object-contain"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Live
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Home;
