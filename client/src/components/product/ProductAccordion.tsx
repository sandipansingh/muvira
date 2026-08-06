import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProductDetail } from '../../lib/types/product'

interface ProductAccordionProps {
  product: ProductDetail
}

export const ProductAccordion: React.FC<ProductAccordionProps> = ({ product }) => {
  const [openSection, setOpenSection] = useState<string | null>('specs')

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id)
  }

  const metadataEntries = Object.entries(product.metadata || {})

  return (
    <div className="border-t border-zinc-200 divide-y divide-zinc-200 mt-12">
      {/* Specifications */}
      <div className="py-4">
        <button
          onClick={() => toggleSection('specs')}
          className="w-full flex items-center justify-between font-serif text-lg font-bold text-zinc-900 py-2 text-left"
        >
          Specifications & Materials
          <ChevronDown
            className={`w-5 h-5 text-zinc-500 transition-transform ${
              openSection === 'specs' ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openSection === 'specs' && (
          <div className="pt-3 pb-2 text-xs space-y-2 text-zinc-700">
            {metadataEntries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F6F4EF] p-4 rounded-xl">
                {metadataEntries.map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-zinc-200/80 pb-1">
                    <span className="font-semibold text-zinc-900">{key}:</span>
                    <span className="text-zinc-600">{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Handcrafted solid hardwood framework with protective satin oil coating.</p>
            )}
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div className="py-4">
        <button
          onClick={() => toggleSection('dimensions')}
          className="w-full flex items-center justify-between font-serif text-lg font-bold text-zinc-900 py-2 text-left"
        >
          Dimensions & Weight
          <ChevronDown
            className={`w-5 h-5 text-zinc-500 transition-transform ${
              openSection === 'dimensions' ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openSection === 'dimensions' && (
          <div className="pt-3 pb-2 text-xs text-zinc-700">
            <p className="bg-[#F6F4EF] p-4 rounded-xl font-medium">
              {product.metadata?.Dimensions || 'Dimensions: W 180cm × D 90cm × H 75cm'}
            </p>
          </div>
        )}
      </div>

      {/* Shipping & Returns */}
      <div className="py-4">
        <button
          onClick={() => toggleSection('shipping')}
          className="w-full flex items-center justify-between font-serif text-lg font-bold text-zinc-900 py-2 text-left"
        >
          Shipping, Delivery & Returns
          <ChevronDown
            className={`w-5 h-5 text-zinc-500 transition-transform ${
              openSection === 'shipping' ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openSection === 'shipping' && (
          <div className="pt-3 pb-2 text-xs text-zinc-600 space-y-2 leading-relaxed">
            <p>
              • <strong>Free White-Glove Shipping:</strong> Compliments orders over ₹1,000 across
              India.
            </p>
            <p>
              • <strong>In-Home Setup:</strong> Our delivery team uncrates, positions, and assembles
              the product in your room of choice.
            </p>
            <p>
              • <strong>30-Day Guarantee:</strong> If the piece doesn't fit your space, return it
              within 30 days in original packaging for a full refund.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
