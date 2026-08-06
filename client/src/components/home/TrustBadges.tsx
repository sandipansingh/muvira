import React from 'react'

export const TrustBadges: React.FC = () => {
  return (
    <section className="py-8 bg-white border-y border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-between text-center divide-y md:divide-y-0 md:divide-x divide-zinc-200/80">
          <div className="py-2">
            <h4 className="font-serif text-3xl font-bold text-zinc-900">2.4k+</h4>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mt-1">
              Happy Homes Furnished
            </p>
          </div>
          <div className="py-2">
            <h4 className="font-serif text-3xl font-bold text-zinc-900">340+</h4>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mt-1">
              Unique Handcrafted Designs
            </p>
          </div>
          <div className="py-2">
            <h4 className="font-serif text-3xl font-bold text-zinc-900">15yr</h4>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mt-1">
              Solid Wood Warranty
            </p>
          </div>
          <div className="py-2">
            <h4 className="font-serif text-3xl font-bold text-[#C88D35]">100%</h4>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mt-1">
              Sustainably Harvested Timber
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
