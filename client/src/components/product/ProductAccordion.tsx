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
    <div className="mt-16 border-t border-line">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        return (
          <div key={section.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between py-5 text-left font-serif text-xl font-bold text-ink"
              aria-expanded={isOpen}
            >
              {section.label}
              <ChevronDown
                className={`h-5 w-5 text-muted-ink transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && section.id === 'specs' && (
              <div className="grid gap-3 pb-6 text-sm text-muted-ink sm:grid-cols-2">
                {metadataEntries.length > 0 ? (
                  metadataEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 border-t border-line pt-3">
                      <span className="font-semibold text-ink">{key}</span>
                      <span>{value}</span>
                    </div>
                  ))
                ) : (
                  <p>Product specifications have not been provided.</p>
                )}
              </div>
            )}
            {isOpen && section.id === 'dimensions' && (
              <p className="pb-6 text-sm leading-6 text-muted-ink">
                {product.metadata?.Dimensions || 'Dimensions have not been provided.'}
              </p>
            )}
            {isOpen && section.id === 'shipping' && (
              <div className="space-y-3 pb-6 text-sm leading-6 text-muted-ink">
                <p>
                  <strong className="text-ink">Free shipping:</strong> Orders over{' '}
                  {formatPrice(settings.shippingRules.freeShippingThresholdPaisa)} qualify for free
                  shipping.
                </p>
                <p>
                  <strong className="text-ink">In-home setup:</strong> Our delivery team uncrates,
                  positions, and assembles the product in your room of choice.
                </p>
                <p>
                  <strong className="text-ink">30-day guarantee:</strong> If the piece does not fit
                  your space, return it within 30 days in original packaging for a full refund.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
