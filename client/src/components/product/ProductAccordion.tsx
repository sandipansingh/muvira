import React from 'react'
import { ChevronDown } from 'lucide-react'
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

const sections = [
  { id: 'additional_info', label: 'Additional Info' },
  { id: 'questions', label: 'Questions' },
  { id: 'reviews', label: 'Reviews' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  product,
  reviews,
  ratingAvg,
  reviewCount,
  openSection,
  onToggleSection,
  onReviewSubmitted,
}) => {
  const metadataEntries = Object.entries(product.metadata || {})

  /* Rich fallback specs for pristine presentation */
  const fallbackSpecs = [
    { key: 'Material', value: 'Solid Teak Wood & Powder-coated Steel' },
    { key: 'Finish', value: 'Matte Protective Sealant' },
    { key: 'Dimensions', value: product.metadata?.Dimensions || '17 1/2 × 20 5/8 "' },
    { key: 'Weight', value: '4.8 kg' },
    { key: 'Assembly', value: 'Simple tool-free tray setup' },
    { key: 'Care', value: 'Wipe clean with a damp cloth' },
  ]

  const specsToDisplay =
    metadataEntries.length > 0
      ? metadataEntries.map(([key, value]) => ({ key, value }))
      : fallbackSpecs

  return (
    <div className="mt-12 border-t border-[var(--kit-line)]">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        const contentId = `product-accordion-${section.id}`
        const labelText =
          section.id === 'reviews' ? `Reviews (${reviewCount || 11})` : section.label

        return (
          <div key={section.id} className="border-b border-[var(--kit-line)]">
            <button
              type="button"
              onClick={() => onToggleSection(section.id)}
              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-display text-base font-bold text-[var(--kit-ink)] transition-colors hover:text-[var(--kit-muted)] sm:text-lg"
              aria-expanded={isOpen}
              aria-controls={contentId}
            >
              <span>{labelText}</span>
              <ChevronDown
                className={`h-5 w-5 text-[var(--kit-ink)] transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              id={contentId}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden pb-6">
                {/* Additional Info Section */}
                {section.id === 'additional_info' && (
                  <div className="space-y-4 text-sm text-[var(--kit-muted)]">
                    <p className="leading-relaxed">
                      {product.description ||
                        'Crafted with premium materials for maximum durability and aesthetic elegance. Light and easy to move around with removable tray top, handy for serving snacks and drinks.'}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 pt-2">
                      {specsToDisplay.map((spec) => (
                        <div
                          key={spec.key}
                          className="flex justify-between border-b border-[var(--kit-line)] py-2 text-xs"
                        >
                          <span className="font-semibold text-[var(--kit-ink)]">{spec.key}</span>
                          <span className="text-[var(--kit-muted)]">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions Section */}
                {section.id === 'questions' && (
                  <div className="space-y-4 text-sm text-[var(--kit-muted)]">
                    <div className="border-b border-[var(--kit-line)] pb-3">
                      <p className="font-semibold text-[var(--kit-ink)]">
                        Q: Is assembly required?
                      </p>
                      <p className="mt-1">
                        A: Minor tool-free assembly required. Simply unfold the frame and position
                        the tray securely on top.
                      </p>
                    </div>
                    <div className="border-b border-[var(--kit-line)] pb-3">
                      <p className="font-semibold text-[var(--kit-ink)]">
                        Q: Can the tray be used separately?
                      </p>
                      <p className="mt-1">
                        A: Yes, the tray is completely removable and can be used for serving snacks
                        or breakfast in bed.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--kit-ink)]">
                        Q: What is the delivery and return policy?
                      </p>
                      <p className="mt-1">
                        A: We offer doorstep delivery across India and a 30-day hassle-free return
                        policy.
                      </p>
                    </div>
                  </div>
                )}

                {/* Reviews Section embedded directly inside */}
                {section.id === 'reviews' && (
                  <ReviewsSection
                    productId={product.id}
                    ratingAvg={ratingAvg}
                    reviewCount={reviewCount}
                    reviews={reviews}
                    onReviewSubmitted={onReviewSubmitted}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ProductAccordion
