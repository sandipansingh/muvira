import React, { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MOCK_PRODUCTS, MOCK_REVIEWS } from '../mock/mockData'
import { ImageGallery } from '../components/product/ImageGallery'
import { ProductInfo } from '../components/product/ProductInfo'
import { ProductAccordion } from '../components/product/ProductAccordion'
import { ReviewsSection } from '../components/product/ReviewsSection'
import { ProductCard } from '../components/catalog/ProductCard'

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()

  const product = useMemo(() => {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) || MOCK_PRODUCTS[0]
  }, [slug])

  const relatedProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4)
  }, [product.id])

  const productReviews = useMemo(() => {
    return MOCK_REVIEWS.filter((r) => r.productId === product.id || r.productId === 'prod-1')
  }, [product.id])

  return (
    <main className="bg-white min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="text-xs text-zinc-500 mb-8 flex items-center gap-2">
          <Link to="/" className="hover:text-zinc-900">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-zinc-900">
            Shop
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium truncate">{product.name}</span>
        </div>

        {/* Top Split: Image Gallery & Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <ImageGallery images={product.images} title={product.name} />
          <ProductInfo product={product} />
        </div>

        {/* Specifications & Accordion Section */}
        <ProductAccordion product={product} />

        {/* Customer Reviews Section */}
        <ReviewsSection
          productId={product.id}
          ratingAvg={product.rating || 4.8}
          reviewCount={product.reviewCount || 12}
          reviews={productReviews}
        />

        {/* You May Also Like Section */}
        <div className="mt-20 pt-12 border-t border-zinc-200">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
              Handcrafted Pairings
            </span>
            <h3 className="font-serif text-3xl font-bold text-zinc-900 mt-1">You May Also Like</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
