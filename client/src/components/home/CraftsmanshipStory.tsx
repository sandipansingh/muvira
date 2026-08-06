import React from 'react'
import { Award, Leaf, Hammer, HeartHandshake } from 'lucide-react'

export const CraftsmanshipStory: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F6F4EF] border-y border-zinc-200/60">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Workshop Image Grid */}
          <div className="relative rounded-3xl overflow-hidden shadow-lg group">
            <img
              src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
              alt="Artisans at Muvira wood workshop"
              className="w-full h-[460px] sm:h-[540px] object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl max-w-xs border border-white/50 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C88D35] text-white flex items-center justify-center font-serif text-lg font-bold">
                  15
                </div>
                <div>
                  <h5 className="font-serif text-sm font-bold text-zinc-900">Years Warranty</h5>
                  <p className="text-xs text-zinc-500">Master joinery guaranteed for life</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
              Our Heritage & Philosophy
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-zinc-900 leading-tight">
              Furniture made to be lived with, not around.
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-light">
              Muvira began with a simple idea: a home should feel calm, considered, and a little
              warmer every year. Every piece starts as a sketch on our workshop floor in Jaipur and
              Bristol. Our small team of joiners work through prototypes by hand before anything
              goes into production—which is why most of our furniture takes 4–6 weeks to make.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-zinc-200/80">
                <Leaf className="w-5 h-5 text-[#C88D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900">Sustainability First</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    100% FSC-certified solid oak, sheesham & walnut.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-zinc-200/80">
                <Hammer className="w-5 h-5 text-[#C88D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900">Honest Hand Craft</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Solid joinery, no drop-shipping, no unnamed factories.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-zinc-200/80">
                <Award className="w-5 h-5 text-[#C88D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900">Made to Last</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    We design for repair, not replacement.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-zinc-200/80">
                <HeartHandshake className="w-5 h-5 text-[#C88D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900">Free In-Home Trial</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    30 days in your home with zero hassle returns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
