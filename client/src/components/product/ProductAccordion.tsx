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
    <div className="mt-12 sm:mt-16 border-t border-[var(--kit-line)] pt-8">
      {/* Horizontal Tabs Header */}
      <div className="border-b border-[var(--kit-line)]">
        <div className="flex gap-8 sm:gap-12 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onToggleSection(tab.id)}
                className={`relative pb-3 text-sm sm:text-base font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-[var(--kit-ink)] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--kit-ink)]'
                    : 'text-[var(--kit-muted)] hover:text-[var(--kit-ink)]'
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
          <div className="py-6 max-w-2xl space-y-6">
            <div className="space-y-2">
              <h4 className="font-display text-sm font-bold text-[var(--kit-muted)] uppercase tracking-wider">
                Details
              </h4>
              <p className="text-sm sm:text-base leading-relaxed text-[var(--kit-ink)]">
                {detailsText}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-display text-sm font-bold text-[var(--kit-muted)] uppercase tracking-wider">
                Packaging
              </h4>
              <div className="text-sm sm:text-base leading-relaxed text-[var(--kit-ink)] space-y-1">
                <p>Width: 20 &quot; &nbsp; Height: 1 ½ &quot; &nbsp; Length: 21 ½ &quot;</p>
                <p>Weight: 7 lb 8 oz</p>
                <p>Package(s): 1</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="py-6 max-w-2xl space-y-6 text-sm sm:text-base">
            <div className="space-y-1 border-b border-[var(--kit-line)] pb-4">
              <h4 className="font-display font-bold text-[var(--kit-ink)]">
                Q: Is assembly required?
              </h4>
              <p className="text-[var(--kit-muted)] leading-relaxed">
                A: Minor tool-free assembly required. Simply unfold the frame and position the tray
                securely on top.
              </p>
            </div>
            <div className="space-y-1 border-b border-[var(--kit-line)] pb-4">
              <h4 className="font-display font-bold text-[var(--kit-ink)]">
                Q: Can the tray be used separately?
              </h4>
              <p className="text-[var(--kit-muted)] leading-relaxed">
                A: Yes, the tray is completely removable and can be used for serving snacks or
                drinks.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-[var(--kit-ink)]">
                Q: What is the delivery and return policy?
              </h4>
              <p className="text-[var(--kit-muted)] leading-relaxed">
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
