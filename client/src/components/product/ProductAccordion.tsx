import React from 'react'
import { CheckCircle2 } from 'lucide-react'
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
  { id: 'description', label: 'Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'shipping', label: 'Shipping & Returns' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  product,
  reviews,
  ratingAvg,
  reviewCount,
  openSection = 'description',
  onToggleSection,
  onReviewSubmitted,
}) => {
  const activeTab = openSection || 'description'

  return (
    <div className="mt-10 pt-6 sm:mt-12">
      {/* Horizontal Tabs Header (Matching Reference Image 1 & 3) */}
      <div className="border-b border-line/60">
        <div className="flex gap-6 overflow-x-auto no-scrollbar sm:gap-8">
          {tabs.map((tab) => {
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
      <div className="py-6">
        {/* Description Tab (Matching Reference Image 1) */}
        {activeTab === 'description' && (
          <div className="max-w-3xl space-y-5">
            <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">
              Authentic Jaipur Craft. Built for Generations.
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-ink-soft/90">
              {product.description ||
                `${product.name} is meticulously shaped and hand-finished by master artisans in our Jaipur atelier. Shaped with solid seasoned timber and natural organic finishes, this piece brings natural warmth, sacred aura, and enduring character to your space.`}
            </p>
            <ul className="space-y-3 pt-1 text-xs sm:text-sm text-ink-soft">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>Hand-selected 100% solid seasoned timber & natural stone slab</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  Organic non-toxic protective sealants highlighting natural grain & figure
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>Traditional precision joinery for lifetime structural durability</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  Pre-assembled and delivered ready for immediate home or temple placement
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  Heavy-duty wooden crate packaging with 100% insured transit across India
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === 'specifications' && (
          <div className="max-w-3xl space-y-3">
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody className="divide-y divide-line">
                  <tr className="bg-surface/50">
                    <td className="w-1/3 px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Product Name
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">{product.name}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      SKU Code
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      {product.sku || 'MVR-2026-ART'}
                    </td>
                  </tr>
                  <tr className="bg-surface/50">
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Category
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">{product.category.name}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Primary Material
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      100% Solid Seasoned Hardwood / Natural Stone
                    </td>
                  </tr>
                  <tr className="bg-surface/50">
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Surface Finish
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      Hand-rubbed natural matte protective sealant
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Assembly
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      Pre-assembled • Ready out of crate
                    </td>
                  </tr>
                  <tr className="bg-surface/50">
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Origin & Craft
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      Handcrafted in Jaipur, Rajasthan, India
                    </td>
                  </tr>
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
            onReviewSubmitted={onReviewSubmitted}
          />
        )}

        {/* Shipping & Returns Tab */}
        {activeTab === 'shipping' && (
          <div className="max-w-3xl space-y-4 text-xs sm:text-sm text-ink-soft">
            <p className="leading-relaxed">
              Every order is dispatched directly from our Jaipur studio within 24 hours. We partner
              with India’s leading premium logistics networks to guarantee safe, insured delivery to
              your doorstep.
            </p>
            <ul className="space-y-2.5 pt-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  <strong>Free Express Shipping:</strong> Complimentarily included on all orders
                  across India.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  <strong>Delivery Timeline:</strong> Estimated 1 to 7 working days depending on
                  destination location.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  <strong>Heavy-Duty Wooden Crate:</strong> Packed in reinforced multi-layer
                  protective packaging for zero-damage transit.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-ink/80 mt-0.5" />
                <span>
                  <strong>7-Day Returns:</strong> 100% hassle-free doorstep pickup if you need an
                  exchange or return.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductAccordion
