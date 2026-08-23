import React from 'react'
import { Feather, Layers, Sparkles } from 'lucide-react'
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
  { id: 'description', label: 'Description & Specifications' },
  { id: 'reviews', label: 'Customer Reviews' },
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
    <div className="mt-10 border-t border-line pt-6 sm:mt-12">
      {/* Horizontal Tabs Header */}
      <div className="border-b border-line">
        <div className="flex gap-6 overflow-x-auto no-scrollbar sm:gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onToggleSection(tab.id)}
                className={`relative pb-3 text-sm font-normal transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-ink font-normal after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'reviews' && reviewCount > 0 && (
                  <span className="ml-1.5 text-xs text-muted">({reviewCount})</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="py-6">
        {/* Merged Description & Specifications Tab */}
        {activeTab === 'description' && (
          <div className="space-y-8">
            {/* Description Text & Craft Cards */}
            <div className="space-y-4">
              <h3 className="font-display text-base font-normal text-ink">Product Story</h3>
              <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-ink-soft">
                <p>
                  {product.description ||
                    `${product.name} is meticulously shaped and assembled by generational woodworkers in our Jaipur atelier. Each piece showcases the organic grain, rich figure, and natural warmth of seasoned hardwood, hand-finished to a smooth satin lustre.`}
                </p>
                <p>
                  Every joint is precision mortise-and-tenon fitted for lifetime structural
                  durability. We believe furniture and artisanal lifestyle decor should be built to
                  endure everyday moments while growing richer in character over decades.
                </p>
              </div>

              {/* Craft Highlights */}
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <h4 className="font-display text-sm font-normal text-ink">
                      Hand-Selected Grain
                    </h4>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Each slab is hand-picked for unique timber grain, natural density, and knot
                    integrity.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Feather className="h-4 w-4" />
                    <h4 className="font-display text-sm font-normal text-ink">
                      Organic Non-Toxic Finish
                    </h4>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Sealed with non-toxic, eco-friendly plant-based oils that highlight natural
                    timber warmth.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Layers className="h-4 w-4" />
                    <h4 className="font-display text-sm font-normal text-ink">Heirloom Joinery</h4>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Traditional wooden joinery guarantees structural stability without wobbly
                    fasteners.
                  </p>
                </div>
              </div>
            </div>

            {/* Specifications Key-Value Table */}
            <div className="max-w-3xl space-y-3 pt-2">
              <h3 className="font-display text-base font-normal text-ink">Specifications</h3>
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
                        100% Solid Seasoned Hardwood (Sheesham / Teak)
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
                        Pre-assembled • Ready to use out of crate
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
