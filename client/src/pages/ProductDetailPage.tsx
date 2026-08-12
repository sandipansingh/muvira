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

  if (loading) return <main className="editorial-page min-h-screen animate-pulse" />

  if (error || !product) {
    return (
      <main className="editorial-page py-space-12 sm:py-space-16">
        <div className="editorial-container max-w-xl text-center">
          <h1 className="editorial-heading text-heading-m-mobile sm:text-heading-m-desktop">
            Product not found
          </h1>
          <p className="mt-space-2 text-body text-muted">
            {error ?? 'This product is no longer available.'}
          </p>
          <Link to="/shop" className="editorial-button mt-space-6 min-h-11">
            Return to shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-space-12 sm:py-space-16">
      <div className="editorial-container">
        <nav
          className="mb-space-8 flex items-center gap-space-2 text-ui text-muted"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="transition-colors duration-control hover:text-terracotta">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="transition-colors duration-control hover:text-terracotta">
            Shop
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-ink">{product.name}</span>
        </nav>
        <div className="grid grid-cols-1 items-start gap-space-12 lg:grid-cols-2">
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
          <section className="mt-space-24 border-t border-rule pt-space-12">
            <div className="mb-space-8">
              <p className="editorial-label">Handcrafted pairings</p>
              <h2 className="editorial-heading mt-space-2 text-heading-m-mobile sm:text-heading-m-desktop">
                You may also like
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-space-6 sm:grid-cols-2 lg:grid-cols-4">
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
