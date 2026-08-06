import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../mock/mockData'
import { FilterBar } from '../components/catalog/FilterBar'
import { ProductGrid } from '../components/catalog/ProductGrid'

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const categoryParam = searchParams.get('category') || 'all'
  const searchQuery = searchParams.get('q') || ''
  const [sortBy, setSortBy] = useState('featured')

  const handleSelectCategory = (catSlug: string) => {
    if (catSlug === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', catSlug)
    }
    setSearchParams(searchParams)
  }

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      // Category filter
      if (categoryParam !== 'all') {
        if (p.category.slug !== categoryParam && p.category.name.toLowerCase() !== categoryParam) {
          return false
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      return 0
    })
  }, [categoryParam, searchQuery, sortBy])

  return (
    <main className="bg-white min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Title & Breadcrumb */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-[#C88D35] uppercase tracking-wider">
            Home / Shop
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 mt-1">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Collections'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Considered solid wood pieces for the home you're building, one room at a time.
          </p>
        </div>

        {/* Filter Bar */}
        <FilterBar
          categories={MOCK_CATEGORIES.map((c) => ({ name: c.name, slug: c.slug }))}
          selectedCategory={categoryParam}
          onSelectCategory={handleSelectCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={filteredProducts.length}
        />

        {/* Product Grid */}
        <ProductGrid products={filteredProducts} />
      </div>
    </main>
  )
}
