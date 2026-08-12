import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPrice } from '../../lib/utils/format'

interface ProductAccordionProps {
  product: ProductDetail
}

const sections = [
  { id: 'specs', label: 'Specifications & materials' },
  { id: 'dimensions', label: 'Dimensions & weight' },
  { id: 'shipping', label: 'Shipping, delivery & returns' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({ product }) => {
  const [openSection, setOpenSection] = useState<string | null>('specs')
  const { settings } = useSiteSettings()
  const metadataEntries = Object.entries(product.metadata || {})

  return (
    <div className="mt-space-16 border-t border-rule">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        const contentId = `product-detail-${section.id}`
        return (
          <div key={section.id} className="border-b border-rule">
            <button
              type="button"
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="flex min-h-11 w-full items-center justify-between gap-space-4 py-space-4 text-left font-display text-heading-s-mobile font-semibold text-ink transition-colors duration-control hover:text-terracotta sm:text-heading-s-desktop"
              aria-expanded={isOpen}
              aria-controls={contentId}
            >
              {section.label}
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted transition-transform duration-accordion motion-reduce:transition-none ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              id={contentId}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-accordion motion-reduce:transition-none ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {section.id === 'specs' && (
                  <div className="grid gap-space-3 pb-space-6 text-body text-muted sm:grid-cols-2">
                    {metadataEntries.length > 0 ? (
                      metadataEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between gap-space-4 border-t border-rule pt-space-3"
                        >
                          <span className="font-semibold text-ink">{key}</span>
                          <span>{value}</span>
                        </div>
                      ))
                    ) : (
                      <p>Product specifications have not been provided.</p>
                    )}
                  </div>
                )}
                {section.id === 'dimensions' && (
                  <p className="pb-space-6 text-body text-muted">
                    {product.metadata?.Dimensions || 'Dimensions have not been provided.'}
                  </p>
                )}
                {section.id === 'shipping' && (
                  <div className="space-y-space-3 pb-space-6 text-body text-muted">
                    <p>
                      <strong className="text-ink">Free shipping:</strong> Orders over{' '}
                      {formatPrice(settings.shippingRules.freeShippingThresholdPaisa)} qualify for
                      free shipping.
                    </p>
                    <p>
                      <strong className="text-ink">In-home setup:</strong> Our delivery team
                      uncrates, positions, and assembles the product in your room of choice.
                    </p>
                    <p>
                      <strong className="text-ink">30-day guarantee:</strong> If the piece does not
                      fit your space, return it within 30 days in original packaging for a full
                      refund.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
