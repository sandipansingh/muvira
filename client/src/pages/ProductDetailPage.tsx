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
import { mergeReviewPage } from '../lib/utils/reviewState'

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductListItem[]>([])
  const [relatedError, setRelatedError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    avgRating: null,
    totalReviews: 0,
  })
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotalPages, setReviewTotalPages] = useState(1)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openAccordionSection, setOpenAccordionSection] = useState<string | null>('description')

  const navigationRef = useRef(0)
  const accordionRef = useRef<HTMLDivElement | null>(null)

  const handleReviewClick = () => {
    setOpenAccordionSection('reviews')
    accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleToggleSection = (sectionId: string) => {
    setOpenAccordionSection(sectionId)
  }

  const loadReviews = useCallback(async (productId: string, page = 1) => {
    const navigation = navigationRef.current
    setReviewError(null)
    if (page > 1) setLoadingMoreReviews(true)
    try {
      const response = await reviewService.getProductReviews(productId, page)
      if (navigation !== navigationRef.current) return
      if (!response.success) throw new Error(response.error.message)
      setReviews((current) => mergeReviewPage(current, response.data, page))
      setReviewSummary(response.summary)
      setReviewPage(response.pagination.page)
      setReviewTotalPages(response.pagination.totalPages)
    } catch (reason) {
      if (navigation !== navigationRef.current) return
      if (page === 1) {
        setReviews([])
        setReviewSummary({ avgRating: null, totalReviews: 0 })
        setReviewPage(1)
        setReviewTotalPages(1)
      }
      setReviewError(reason instanceof Error ? reason.message : 'Unable to load reviews.')
    } finally {
      if (navigation === navigationRef.current && page > 1) setLoadingMoreReviews(false)
    }
  }, [])

  const loadMoreReviews = async () => {
    if (!product || loadingMoreReviews || reviewPage >= reviewTotalPages) return
    await loadReviews(product.id, reviewPage + 1)
  }

  useEffect(() => {
    if (!slug) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const navigationState = navigationRef
    const navigation = ++navigationState.current
    setReviews([])
    setReviewSummary({ avgRating: null, totalReviews: 0 })
    setReviewPage(1)
    setReviewTotalPages(1)
    setLoadingMoreReviews(false)
    let active = true
    const loadProduct = async () => {
      setLoading(true)
      setError(null)
      setRelatedError(null)
      setRelatedProducts([])
      try {
        const response = await productService.getProductBySlug(slug)
        if (!response.success) throw new Error(response.error.message)
        const productData = response.data
        if (!active) return
        setProduct(productData)
        setLoading(false)
        void loadReviews(productData.id)
        void productService
          .getRelatedProducts(productData.id)
          .then((relatedResponse) => {
            if (!active) return
            if (relatedResponse.success) setRelatedProducts(relatedResponse.data)
            else setRelatedError(relatedResponse.error.message)
          })
          .catch((reason: unknown) => {
            if (active)
              setRelatedError(
                reason instanceof Error ? reason.message : 'Unable to load related products.'
              )
          })
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
      if (navigationState.current === navigation) navigationState.current++
    }
  }, [loadReviews, slug])

  if (loading) {
    return (
      <main className="editorial-page py-8">
        <div className="editorial-container">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="aspect-square animate-pulse rounded-card bg-[var(--color-surface)]" />
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
    <main className="product-page editorial-page pb-24 sm:pb-12">
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
        <div className="grid grid-cols-1 items-start gap-8 pt-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div>
            <ImageGallery
              images={product.images}
              title={product.name}
              isNew={product.isFeatured}
              discountPercent={product.discountPercent}
            />
          </div>
          <div className="lg:sticky lg:top-44 lg:self-start">
            <ProductInfo product={product} onReviewClick={handleReviewClick} />
          </div>
        </div>

        {/* Accordion Tabs (Embedded Additional Info, Questions, and Customer Reviews) */}
        <div ref={accordionRef}>
          <ProductAccordion
            product={product}
            reviews={reviews}
            ratingAvg={reviewSummary.avgRating ?? product.rating ?? null}
            reviewCount={reviewSummary.totalReviews || product.reviewCount || 0}
            reviewError={reviewError}
            hasMoreReviews={reviewPage < reviewTotalPages}
            loadingMoreReviews={loadingMoreReviews}
            openSection={openAccordionSection}
            onToggleSection={handleToggleSection}
            onLoadMoreReviews={loadMoreReviews}
            onReviewSubmitted={() => loadReviews(product.id, 1)}
            onReviewRetry={() => loadReviews(product.id, 1)}
          />
        </div>

        {/* Related Products */}
        {relatedError && (
          <p className="mt-12 rounded-xl border border-line bg-surface p-5 text-center text-sm text-ink">
            Related products could not be loaded: {relatedError}
          </p>
        )}
        {!relatedError && relatedProducts.length > 0 && (
          <section className="mt-12 pt-8">
            <SectionHeader
              title="You May Also Like"
              subtitle={`More products from ${product.category.name}`}
            />
            <div className="mt-6 product-collection">
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
