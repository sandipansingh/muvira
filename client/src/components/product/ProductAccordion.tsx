import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { useSiteSettings } from '../../context/SiteSettingsContext'

interface ProductAccordionProps {
  product: ProductDetail
  reviewCount?: number
  onReviewsToggle?: () => void
}

const sections = [
  { id: 'additional_info', label: 'Additional Info' },
  { id: 'questions', label: 'Questions' },
  { id: 'reviews', label: 'Reviews' },
]

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  product,
  reviewCount = 11,
  onReviewsToggle,
}) => {
  const [openSection, setOpenSection] = useState<string | null>('additional_info')
  const { settings } = useSiteSettings()
  const metadataEntries = Object.entries(product.metadata || {})

  const handleToggle = (sectionId: string) => {
    if (sectionId === 'reviews' && onReviewsToggle) {
      onReviewsToggle()
    }
    setOpenSection((prev) => (prev === sectionId ? null : sectionId))
  }

  return (
    <div className="mt-12 border-t border-[var(--kit-line)]">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        const contentId = `product-accordion-${section.id}`
        const labelText =
          section.id === 'reviews' ? `Reviews (${reviewCount})` : section.label

        return (
          <div key={section.id} className="border-b border-[var(--kit-line)]">
            <button
              type="button"
              onClick={() => handleToggle(section.id)}
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
                {section.id === 'additional_info' && (
                  <div className="space-y-4 text-sm text-[var(--kit-muted)]">
                    <p className="leading-relaxed">
                      {product.description ||
                        'Crafted with premium materials for maximum durability and aesthetic elegance.'}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {metadataEntries.length > 0 ? (
                        metadataEntries.map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between border-b border-[var(--kit-line)] py-2 text-xs"
                          >
                            <span className="font-semibold text-[var(--kit-ink)]">{key}</span>
                            <span>{value}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between border-b border-[var(--kit-line)] py-2 text-xs">
                            <span className="font-semibold text-[var(--kit-ink)]">Details</span>
                            <span>Tray Table</span>
                          </div>
                          <div className="flex justify-between border-b border-[var(--kit-line)] py-2 text-xs">
                            <span className="font-semibold text-[var(--kit-ink)]">Style</span>
                            <span>Modern Scandinavian</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {section.id === 'questions' && (
                  <div className="space-y-3 text-sm text-[var(--kit-muted)]">
                    <div>
                      <p className="font-semibold text-[var(--kit-ink)]">Q: Is assembly required?</p>
                      <p className="mt-1">A: Minor tool-free assembly required. Instructions included.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--kit-ink)]">Q: What is the return period?</p>
                      <p className="mt-1">
                        A: We offer a 30-day hassle-free return window for all items.
                      </p>
                    </div>
                  </div>
                )}

                {section.id === 'reviews' && (
                  <p className="text-sm text-[var(--kit-muted)]">
                    See Customer Reviews section below for detailed ratings and user feedback.
                  </p>
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
