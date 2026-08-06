import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MOCK_PRODUCTS } from '../../mock/mockData'
import { ProductCard } from '../catalog/ProductCard'

export const BestSellers: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All')

  const filterOptions = ['All', 'Sofas', 'Chairs', 'Tables', 'Lighting', 'Decor']

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    if (selectedFilter === 'All') return true
    return p.category.name.toLowerCase() === selectedFilter.toLowerCase()
  })

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
              Customer Favorites
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 mt-1">
              Our Best Sellers
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  selectedFilter === filter
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-[#F6F4EF] text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid (using Warm Off-White Cards bg-[#F6F4EF]) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#F6F4EF] text-zinc-900 hover:bg-zinc-900 hover:text-white font-semibold text-sm transition-all shadow-xs border border-zinc-200"
          >
            View All Products <ArrowRight className="w-4 h-4 text-[#C88D35]" />
          </Link>
        </div>
      </div>
    </section>
  )
}
