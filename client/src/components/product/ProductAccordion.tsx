import React from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProductDetail, ProductReview } from '../../lib/types/product'
import { ReviewsSection } from './ReviewsSection'

interface ProductAccordionProps {
  product: ProductDetail
  reviews: ProductReview[]
  ratingAvg: number | null
  reviewCount: number
  reviewError?: string | null
  hasMoreReviews?: boolean
  loadingMoreReviews?: boolean
  openSection: string | null
  onToggleSection: (sectionId: string) => void
  onLoadMoreReviews?: () => Promise<void>
  onReviewSubmitted?: () => Promise<void>
  onReviewRetry?: () => Promise<void>
}

const tabs = [
  { id: 'description', label: 'Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'shipping', label: 'Shipping' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  product,
  reviews,
  ratingAvg,
  reviewCount,
  reviewError,
  hasMoreReviews,
  loadingMoreReviews,
  openSection = 'description',
  onToggleSection,
  onLoadMoreReviews,
  onReviewSubmitted,
  onReviewRetry,
}) => {
  const activeTab = openSection || 'description'
  const care = Object.entries(product.metadata ?? {}).filter(([key]) => /care/i.test(key))
  const availableTabs = care.length ? [...tabs, { id: 'care', label: 'Care' }] : tabs

  return (
    <div className="product-information mt-10 pt-6 sm:mt-12">
      <h2 className="mb-6 text-h2">A closer look</h2>
      <div className="border-b border-line/60">
        <div className="flex flex-col md:hidden">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onToggleSection(tab.id)}
              className="flex min-h-[var(--tap-target)] w-full items-center justify-between gap-3 border-t border-line py-2 text-left text-base text-ink"
              aria-expanded={activeTab === tab.id}
              aria-controls="product-detail-panel"
            >
              <span>
                {tab.label}
                {tab.id === 'reviews' && reviewCount > 0 ? ` (${reviewCount})` : ''}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${activeTab === tab.id ? 'rotate-180' : ''}`}
              />
            </button>
          ))}
        </div>
        <div className="hidden gap-6 overflow-x-auto no-scrollbar md:flex md:gap-8">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onToggleSection(tab.id)}
                className={`relative pb-3.5 text-sm font-normal transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-ink font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-ink'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'reviews' && reviewCount > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted">({reviewCount})</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Container */}
      <div id="product-detail-panel" className="py-6">
        {activeTab === 'care' && (
          <div className="max-w-3xl space-y-4 text-base leading-8 text-ink-soft">
            {care.map(([label, instructions]) => (
              <div key={label}>
                <h3 className="mb-2 font-sans text-sm font-semibold capitalize text-ink">
                  {label.replaceAll('_', ' ')}
                </h3>
                <p className="whitespace-pre-line">{instructions}</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'description' && (
          <div className="max-w-3xl space-y-5">
            {product.description ? (
              <p className="whitespace-pre-line text-base leading-8 text-ink-soft">
                {product.description}
              </p>
            ) : (
              <p className="text-base text-muted">A product description is not available.</p>
            )}
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === 'specifications' && (
          <div className="max-w-3xl space-y-3">
            <div className="max-w-full overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-line">
                  <tr className="bg-surface/50">
                    <td className="w-1/3 px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Product Name
                    </td>
                    <td className="font-product px-4 py-3 font-normal text-ink">{product.name}</td>
                  </tr>
                  {product.sku && (
                    <tr>
                      <td className="px-4 py-3 text-xs font-normal uppercase tracking-wider text-muted">
                        SKU Code
                      </td>
                      <td className="px-4 py-3 font-normal text-ink">{product.sku}</td>
                    </tr>
                  )}
                  <tr className="bg-surface/50">
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Category
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">{product.category.name}</td>
                  </tr>
                  {product.weightGrams != null && (
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left font-normal text-muted">
                        Weight
                      </th>
                      <td className="px-4 py-3">{product.weightGrams.toLocaleString('en-IN')} g</td>
                    </tr>
                  )}
                  {Object.entries(product.metadata ?? {}).map(([label, value]) => (
                    <tr key={label}>
                      <td className="px-4 py-3 text-xs font-normal uppercase tracking-wider text-muted">
                        {label.replaceAll('_', ' ')}
                      </td>
                      <td className="px-4 py-3 font-normal text-ink">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <ReviewsSection
            productId={product.id}
            productName={product.name}
            ratingAvg={ratingAvg}
            reviewCount={reviewCount}
            reviews={reviews}
            error={reviewError}
            hasMore={hasMoreReviews}
            loadingMore={loadingMoreReviews}
            onLoadMore={onLoadMoreReviews}
            onRetry={onReviewRetry}
            onReviewSubmitted={onReviewSubmitted}
          />
        )}

        {/* Shipping tab */}
        {activeTab === 'shipping' && (
          <div className="max-w-3xl space-y-3 text-base text-ink-soft">
            <p className="leading-relaxed">
              Available shipping methods and their exact charges are calculated from the current
              delivery configuration during checkout.
            </p>
            <p className="text-muted">
              Review your delivery details and the final total before continuing to payment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductAccordion
