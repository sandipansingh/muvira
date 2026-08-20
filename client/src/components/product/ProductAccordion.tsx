import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPrice } from '../../lib/utils/format'

interface ProductAccordionProps {
  product: ProductDetail
}

const sections = [
  { id: 'specs', label: 'Specifications & Materials' },
  { id: 'dimensions', label: 'Dimensions & Weight' },
  { id: 'shipping', label: 'Shipping, Delivery & Returns' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({ product }) => {
  const [openSection, setOpenSection] = useState<string | null>('specs')
  const { settings } = useSiteSettings()
  const metadataEntries = Object.entries(product.metadata || {})

  return (
    <div className="mt-16 border-t border-[var(--kit-line)]">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        const contentId = `product-detail-${section.id}`
        return (
          <div key={section.id} className="border-b border-[var(--kit-line)]">
            <button
              type="button"
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 py-5 text-left font-display text-base font-bold text-[var(--kit-ink)] transition-colors hover:text-[var(--kit-muted)] sm:text-lg"
              aria-expanded={isOpen}
              aria-controls={contentId}
            >
              <span>{section.label}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--kit-radius-control)] transition-colors duration-200 ${
                  isOpen
                    ? 'bg-[var(--kit-ink)] text-white'
                    : 'bg-[var(--kit-surface)] text-[var(--kit-ink)]'
                }`}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>
            <div
              id={contentId}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {section.id === 'specs' && (
                  <div className="grid gap-3 pb-6 text-sm text-neutral-600 sm:grid-cols-2">
                    {metadataEntries.length > 0 ? (
                      metadataEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between gap-4 border-t border-[var(--kit-line)] pt-3"
                        >
                          <span className="font-semibold text-foreground">{key}</span>
                          <span>{value}</span>
                        </div>
                      ))
                    ) : (
                      <p>Product specifications have not been provided.</p>
                    )}
                  </div>
                )}
                {section.id === 'dimensions' && (
                  <p className="pb-6 text-sm text-neutral-600">
                    {product.metadata?.Dimensions || 'Dimensions have not been provided.'}
                  </p>
                )}
                {section.id === 'shipping' && (
                  <div className="space-y-3 pb-6 text-sm text-neutral-600 leading-relaxed">
                    <p>
                      <strong className="font-bold text-foreground">Free Shipping:</strong> Orders
                      over {formatPrice(settings.shippingRules.freeShippingThresholdPaisa)} qualify
                      for free doorstep delivery.
                    </p>
                    <p>
                      <strong className="font-bold text-foreground">In-Home Assembly:</strong> Our
                      logistics partners unbox, inspect, and assemble all heavy timber pieces in
                      your room of choice.
                    </p>
                    <p>
                      <strong className="font-bold text-foreground">30-Day Guarantee:</strong> If a
                      catalog piece does not suit your space, initiate a return within 30 days of
                      delivery.
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

export default ProductAccordion
