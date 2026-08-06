import React from 'react'
import { ArrowRight, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export const PromoGrid: React.FC = () => {
  return (
    <section className="bg-white py-12 sm:py-16 border-t border-slate-200/60">
      <div className="editorial-container">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Special Offer (Dark Slate) */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-lg flex flex-col justify-between group">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                <Gift className="h-3.5 w-3.5 text-amber-400" />
                <span>Special Offer</span>
              </div>
              <h3 className="font-serif text-3xl font-extrabold tracking-tight mt-4 text-white">
                GET 10% OFF
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
                Subscribe to our newsletter or use promo code{' '}
                <strong className="text-white font-bold underline">MUVIRA10</strong> at checkout.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-slate-900 transition-all hover:bg-slate-100 group-hover:gap-3"
              >
                <span>Get Discount</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: New Season Look (Beige / Warm Tone) */}
          <div className="relative overflow-hidden rounded-3xl bg-amber-50/80 p-8 border border-amber-200/60 shadow-xs flex flex-col justify-between group">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/60 px-3.5 py-1 text-xs font-bold text-[#7e3d1c]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>New Season</span>
              </div>
              <h3 className="font-serif text-2xl font-extrabold tracking-tight mt-4 text-slate-900">
                NEW LOOK & DESIGNS
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                Discover the latest artisanal trends and solid wood furniture handcrafted for
                everyday elegance.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-[#7e3d1c] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#693116] group-hover:gap-3"
              >
                <span>Shop Now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Artisanal Guarantee (Light Slate / Ivory) */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-50 p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between group">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-200/80 px-3.5 py-1 text-xs font-bold text-slate-800">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-900" />
                <span>100% Solid Wood</span>
              </div>
              <h3 className="font-serif text-2xl font-extrabold tracking-tight mt-4 text-slate-900">
                15-YEAR WARRANTY
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                Every piece is hand-carved by master Indian craftsmen using responsibly sourced
                timber.
              </p>
            </div>
            <div className="pt-6">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-xs transition-all hover:bg-slate-100 group-hover:gap-3"
              >
                <span>Learn More</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
