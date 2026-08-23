import React from 'react'
import { Award, Feather, HeartHandshake, Layers, ShieldCheck, Sparkles, Truck } from 'lucide-react'
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
  { id: 'atelier', label: 'Muvira Atelier' },
  { id: 'reviews', label: 'Customer Reviews' },
  { id: 'shipping', label: 'Care & Shipping' },
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
    <div className="mt-12 border-t border-line pt-8 sm:mt-16">
      {/* Horizontal Tabs Header (Reference 1) */}
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
        {/* 1. Description Tab */}
        {activeTab === 'description' && (
          <div className="space-y-6">
            <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-ink-soft">
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

            {/* Craft Highlights Grid */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2.5 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="font-display text-sm font-normal text-ink">Hand-Selected Grain</h4>
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
                  Sealed with non-toxic, eco-friendly plant-based oils that highlight natural timber
                  warmth.
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
        )}

        {/* 2. Specifications & Dimensions Tab (Reference 1 & 2 Key-Value Table) */}
        {activeTab === 'specifications' && (
          <div className="max-w-3xl space-y-6">
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
                  <tr>
                    <td className="px-4 py-3 font-normal text-muted uppercase tracking-wider text-xs">
                      Packaging
                    </td>
                    <td className="px-4 py-3 font-normal text-ink">
                      Shockproof 7-ply box + corner foam & wooden frame support
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Muvira Atelier Tab (Single-Store Direct Craft Guarantee) */}
        {activeTab === 'atelier' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-normal text-ink sm:text-xl">
                    Muvira Artisan Atelier — Direct from the Maker
                  </h3>
                  <p className="text-xs text-muted">
                    Single-brand genuine artisan workshop • Jaipur, India
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Muvira is not a third-party marketplace or reseller. Every single product listed in
                our store is designed in-house and hand-hewn by our master artisan collective. When
                you order from Muvira, your item travels straight from our workshop floor to your
                doorstep.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h5 className="font-normal text-sm text-ink">Zero Middlemen Markups</h5>
                    <p className="text-xs text-muted mt-0.5">
                      Fair direct-to-consumer pricing that supports artisan families directly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
                  <HeartHandshake className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h5 className="font-normal text-sm text-ink">Ethical & Certified Timber</h5>
                    <p className="text-xs text-muted mt-0.5">
                      Sustainably sourced Indian timber from government-regulated plantations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Reviews Tab */}
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

        {/* 5. Care & Shipping Tab */}
        {activeTab === 'shipping' && (
          <div className="max-w-3xl space-y-6 text-sm text-ink-soft">
            <div className="space-y-3">
              <h4 className="font-display text-base font-normal text-ink flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Shipping & Pan-India Transit
              </h4>
              <p className="leading-relaxed">
                All furniture and delicate craft pieces are dispatched within 24–48 hours from our
                Jaipur workshop. Standard delivery takes 2–5 business days depending on your
                pincode. We utilize specialized heavy-goods courier partners with door-step delivery
                and unboxing support.
              </p>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <h4 className="font-display text-base font-normal text-ink">
                Care & Maintenance Guide
              </h4>
              <ul className="list-disc space-y-1.5 pl-5 text-xs sm:text-sm text-muted">
                <li>Dust regularly using a dry, lint-free microfiber cloth.</li>
                <li>
                  Avoid prolonged direct exposure to intense harsh sunlight or damp conditions.
                </li>
                <li>
                  Clean spills immediately with a damp cloth; do not use harsh chemical cleaners or
                  abrasive pads.
                </li>
                <li>
                  Apply beeswax or natural wood polish once every 6 months to maintain lustre and
                  timber hydration.
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <h4 className="font-display text-base font-normal text-ink">
                30-Day Hassle-Free Returns
              </h4>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                In the rare event of transit damage or manufacturing defects, contact our concierge
                team within 30 days for an immediate no-questions-asked replacement or full refund.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductAccordion
