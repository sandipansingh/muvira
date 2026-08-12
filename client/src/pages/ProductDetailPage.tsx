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
import { SectionHeader } from '../components/common/SectionHeader'

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

  if (loading) {
    return (
      <main className="editorial-page py-12">
        <div className="layout-container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="aspect-square rounded-[2rem] animate-pulse bg-neutral-100" />
            <div className="space-y-4">
              <div className="h-6 w-1/4 rounded-full animate-pulse bg-neutral-100" />
              <div className="h-10 w-3/4 rounded-2xl animate-pulse bg-neutral-100" />
              <div className="h-6 w-1/3 rounded-full animate-pulse bg-neutral-100" />
              <div className="h-24 w-full rounded-2xl animate-pulse bg-neutral-100" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="editorial-page py-16 sm:py-24">
        <div className="layout-container max-w-xl text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Product not found</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {error ?? 'This product is no longer available.'}
          </p>
          <Link to="/shop" className="editorial-button mt-6">
            Return to Shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page py-8 sm:py-12">
      <div className="layout-container">
        {/* Breadcrumbs */}
        <nav
          className="mb-8 flex items-center gap-2 text-xs font-semibold text-neutral-400"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="hover:text-brand transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-brand transition-colors">
            Shop
          </Link>
          <span>/</span>
          <Link
            to={`/shop?category=${product.category.slug}`}
            className="hover:text-brand transition-colors"
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="truncate font-bold text-foreground">{product.name}</span>
        </nav>

        {/* Gallery + Product Info Grid */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <ImageGallery images={product.images} title={product.name} />
          <ProductInfo product={product} />
        </div>

        {/* Specifications Accordion */}
        <ProductAccordion product={product} />

        {/* Reviews Section */}
        <ReviewsSection
          productId={product.id}
          ratingAvg={reviewSummary.avgRating ?? product.rating ?? null}
          reviewCount={reviewSummary.totalReviews || product.reviewCount || 0}
          reviews={reviews}
          onReviewSubmitted={() => loadReviews(product.id)}
        />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 border-t border-border-light pt-16">
            <SectionHeader
              title="You May Also Like"
              subtitle="Handcrafted pieces from the same master artisan workshops"
            />
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mt-8">
              {relatedProducts.slice(0, 4).map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default ProductDetailPage
