import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { productService } from '../../lib/services/product.service'
import type { ProductListItem } from '../../lib/types/product'
import { ProductCard } from '../catalog/ProductCard'

export const NewArrivals: React.FC = () => {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void productService
      .getProducts({ page: 1, limit: 4, sort: 'newest' })
      .then((response) => {
        if (!response.success) throw new Error(response.error.message)
        if (active) setProducts(response.data)
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load new arrivals.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <section className="editorial-container section-space" aria-labelledby="new-arrivals-title">
      <div className="collection-heading">
        <div>
          <span className="eyebrow">A fresh discovery</span>
          <h2 id="new-arrivals-title" className="mt-3 text-h2">
            New to Muvira
          </h2>
        </div>
        <Link to="/shop?sort=newest" className="collection-link">
          View new arrivals <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {loading && (
        <p className="py-16 text-muted" role="status">
          Loading new arrivals…
        </p>
      )}
      {!loading && error && (
        <p className="panel p-6 text-muted" role="status">
          {error}{' '}
          <Link to="/shop" className="underline">
            Browse the shop
          </Link>
        </p>
      )}
      {!loading && !error && products.length === 0 && (
        <p className="py-12 text-muted">New arrivals will appear here as the collection grows.</p>
      )}
      {!loading && !error && (
        <div className="new-arrivals-collection">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
export default NewArrivals
