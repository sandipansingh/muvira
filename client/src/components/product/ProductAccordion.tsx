import React from 'react'
import type { ProductDetail, ProductReview } from '../../lib/types/product'
import { ReviewsSection } from './ReviewsSection'

interface ProductAccordionProps {
  product: ProductDetail
  reviews: ProductReview[]
  ratingAvg: number | null
  reviewCount: number
  openSection: string | null
  onToggleSection: (sectionId: string) => void
  onReviewSubmitted?: () => Promise<void>
}

const tabs = [
  { id: 'additional_info', label: 'Additional Info' },
  { id: 'questions', label: 'Questions' },
  { id: 'reviews', label: 'Reviews' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  product,
  reviews,
  ratingAvg,
  reviewCount,
  openSection = 'reviews',
  onToggleSection,
  onReviewSubmitted,
}) => {
  const activeTab = openSection || 'reviews'

  /* Clean and concise details description */
  const detailsText =
    product.shortDescription ||
    'You can use the removable tray for serving. The design makes it easy to put the tray back after use since you place it directly on the table frame without having to fit it into any holes.'

  return (
    <div className="mt-10 border-t border-[var(--color-line)] pt-6 sm:mt-12">
      {/* Horizontal Tabs Header */}
      <div className="border-b border-[var(--color-line)]">
        <div className="flex gap-6 overflow-x-auto no-scrollbar sm:gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onToggleSection(tab.id)}
                className={`relative pb-2.5 text-sm font-normal transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-[var(--color-ink)] font-normal after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="py-2">
        {/* Additional Info Tab */}
        {activeTab === 'additional_info' && (
          <div className="max-w-2xl space-y-5 py-5">
            <div className="space-y-2">
              <h4 className="font-display text-sm font-normal text-[var(--color-muted)] uppercase tracking-wider">
                Details
              </h4>
              <p className="text-sm leading-relaxed text-[var(--color-ink)]">{detailsText}</p>
            </div>

            <div className="space-y-2 pt-1">
              <h4 className="font-display text-sm font-normal text-[var(--color-muted)] uppercase tracking-wider">
                Packaging
              </h4>
              <div className="space-y-1 text-sm leading-relaxed text-[var(--color-ink)]">
                <p>Width: 20 &quot; &nbsp; Height: 1 ½ &quot; &nbsp; Length: 21 ½ &quot;</p>
                <p>Weight: 7 lb 8 oz</p>
                <p>Package(s): 1</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="max-w-2xl space-y-5 py-5 text-sm">
            <div className="space-y-1 border-b border-[var(--color-line)] pb-4">
              <h4 className="font-display font-normal text-[var(--color-ink)]">
                Q: Is assembly required?
              </h4>
              <p className="text-[var(--color-muted)] leading-relaxed">
                A: Minor tool-free assembly required. Simply unfold the frame and position the tray
                securely on top.
              </p>
            </div>
            <div className="space-y-1 border-b border-[var(--color-line)] pb-4">
              <h4 className="font-display font-normal text-[var(--color-ink)]">
                Q: Can the tray be used separately?
              </h4>
              <p className="text-[var(--color-muted)] leading-relaxed">
                A: Yes, the tray is completely removable and can be used for serving snacks or
                drinks.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-normal text-[var(--color-ink)]">
                Q: What is the delivery and return policy?
              </h4>
              <p className="text-[var(--color-muted)] leading-relaxed">
                A: We offer doorstep delivery across India and a 30-day hassle-free return policy.
              </p>
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
            onReviewSubmitted={onReviewSubmitted}
          />
        )}
      </div>
    </div>
  )
}

export default ProductAccordion
