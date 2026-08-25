import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { ProductCard } from '../components/catalog/ProductCard'
import { SectionHeader } from '../components/common/SectionHeader'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

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
  const [openAccordionSection, setOpenAccordionSection] = useState<string | null>('description')

  const accordionRef = useRef<HTMLDivElement | null>(null)

  const handleReviewClick = () => {
    setOpenAccordionSection('reviews')
    accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleToggleSection = (sectionId: string) => {
    setOpenAccordionSection(sectionId)
  }

  const loadReviews = useCallback(async (productId: string) => {
    const response = await reviewService.getProductReviews(productId)
    if (!response.success) throw new Error(response.error.message)
    setReviews(response.data)
    setReviewSummary(response.summary)
  }, [])

  useEffect(() => {
    if (!slug) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
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
      <main className="editorial-page py-8">
        <div className="editorial-container">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="aspect-square animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            <div className="space-y-4">
              <div className="h-6 w-1/4 animate-pulse rounded bg-[var(--color-line)]" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-[var(--color-line)]" />
              <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--color-line)]" />
              <div className="h-24 w-full animate-pulse rounded bg-[var(--color-line)]" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="editorial-page py-12 sm:py-16">
        <div className="editorial-container max-w-xl text-center">
          <h1 className="heading page-title">Product not found</h1>
          <p className="body-copy mt-2 text-sm">
            {error ?? 'This product is no longer available.'}
          </p>
          <Link to="/shop" className="button-primary mt-6">
            Return to Shop
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="editorial-page">
      <div className="editorial-container py-4 sm:py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shop', href: '/shop' },
            {
              label: product.category.name,
              href: `/shop?category=${product.category.slug}`,
            },
            { label: product.name },
          ]}
        />

        {/* Gallery + Product Info Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          <div className="lg:col-span-6 xl:col-span-6">
            <ImageGallery
              images={product.images}
              title={product.name}
              isNew={product.isFeatured}
              discountPercent={product.discountPercent || 50}
            />
          </div>
          <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto no-scrollbar">
            <ProductInfo product={product} onReviewClick={handleReviewClick} />
          </div>
        </div>

        {/* Accordion Tabs (Embedded Additional Info, Questions, and Customer Reviews) */}
        <div ref={accordionRef}>
          <ProductAccordion
            product={product}
            reviews={reviews}
            ratingAvg={reviewSummary.avgRating ?? product.rating ?? null}
            reviewCount={reviewSummary.totalReviews || product.reviewCount || 11}
            openSection={openAccordionSection}
            onToggleSection={handleToggleSection}
            onReviewSubmitted={() => loadReviews(product.id)}
          />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 pt-8">
            <SectionHeader
              title="You May Also Like"
              subtitle="Handcrafted pieces from the same master artisan workshops"
            />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {relatedProducts.slice(0, 5).map((related) => (
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
