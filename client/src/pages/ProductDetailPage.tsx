import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { productService } from '../lib/services/product.service'
import { reviewService } from '../lib/services/review.service'
import type {
  ProductDetail,
  ProductListItem,
  ProductReview,
  ReviewSummary,
} from '../lib/types/product'
import { ImageGallery } from '../components/product/ImageGallery'
import { ProductInfo } from '../components/product/ProductInfo'
import { ProductAccordion } from '../components/product/ProductAccordion'
import { ReviewsSection } from '../components/product/ReviewsSection'
import { ProductCard } from '../components/catalog/ProductCard'

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductListItem[]>([])
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    avgRating: null,
    totalReviews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReviews = useCallback(async (productId: string) => {
    const response = await reviewService.getProductReviews(productId)
    if (!response.success) throw new Error(response.error.message)
    setReviews(response.data)
    setReviewSummary(response.summary)
  }, [])

  useEffect(() => {
    if (!slug) return
    let active = true
    const loadProduct = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await productService.getProductBySlug(slug)
        if (!response.success) throw new Error(response.error.message)
        const productData = response.data
        const [relatedResponse] = await Promise.all([
          productService.getRelatedProducts(productData.id),
          loadReviews(productData.id).catch(() => undefined),
        ])
        if (active) {
          setProduct(productData)
          if (relatedResponse.success) setRelatedProducts(relatedResponse.data)
        }
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load this product.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadProduct()
    return () => {
      active = false
    }
  }, [loadReviews, slug])

  if (loading) return <main className="editorial-page min-h-[60vh] animate-pulse" />

  if (error || !product) {
    return (
      <main className="editorial-page px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl border border-line bg-ivory p-10 text-center">
          <h1 className="editorial-heading text-3xl">Product not found</h1>
          <p className="mt-2 text-sm text-muted-ink">
            {error ?? 'This product is no longer available.'}
          </p>
          <Link to="/shop" className="editorial-button mt-6">
            Return to shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="editorial-container">
        <div className="mb-8 flex items-center gap-2 text-xs text-muted-ink">
          <Link to="/" className="hover:text-cognac">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-cognac">
            Shop
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-ink">{product.name}</span>
        </div>
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <ImageGallery images={product.images} title={product.name} />
          <ProductInfo product={product} />
        </div>
        <ProductAccordion product={product} />
        <ReviewsSection
          productId={product.id}
          ratingAvg={reviewSummary.avgRating ?? product.rating ?? null}
          reviewCount={reviewSummary.totalReviews || product.reviewCount || 0}
          reviews={reviews}
          onReviewSubmitted={() => loadReviews(product.id)}
        />
        {relatedProducts.length > 0 && (
          <section className="mt-20 border-t border-line pt-12">
            <div className="mb-10">
              <p className="editorial-label">Handcrafted pairings</p>
              <h2 className="editorial-heading mt-3 text-4xl">You may also like</h2>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
