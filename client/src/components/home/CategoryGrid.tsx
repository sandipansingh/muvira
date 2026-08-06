import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { MOCK_CATEGORIES } from '../../mock/mockData'

export const CategoryGrid: React.FC = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
              Curated Spaces
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 hover:text-[#C88D35] transition-colors"
          >
            View all categories <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.slug}`}
              className="group relative h-[360px] sm:h-[420px] rounded-2xl overflow-hidden shadow-xs border border-zinc-100 block"
            >
              {/* Category Background Image */}
              <img
                src={cat.imageUrl}
                alt={cat.name}
                className="w-full h-full object-cover object-center transform group-hover:scale-108 transition-transform duration-700"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity group-hover:from-black/90" />

              {/* Top right item count badge */}
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full border border-white/30">
                {cat.itemCount} pieces
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="font-serif text-2xl font-bold tracking-tight mb-1 group-hover:translate-x-1 transition-transform">
                  {cat.name}
                </h3>
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-light">
                  {cat.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C88D35] group-hover:underline">
                  Explore Collection <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
