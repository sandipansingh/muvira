import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const FAQ_ITEMS = [
  {
    id: 'delivery',
    question: 'Where do you deliver, and how long will it take?',
    answer:
      'Delivery availability and timing can vary by location and item. Contact us before ordering for the latest guidance for your address.',
  },
  {
    id: 'tracking',
    question: 'How can I track my order?',
    answer:
      'Order updates are shared as they become available. If you need help locating an order, contact us with your order details.',
  },
  {
    id: 'returns',
    question: 'What is your returns and exchanges process?',
    answer:
      'Returns and exchanges are reviewed case by case. Reach out with your order details and our team will guide you through the next steps.',
  },
  {
    id: 'dimensions',
    question: 'How do I check dimensions and sizing?',
    answer:
      'Product pages list the dimensions and details available for each piece. Contact us if you need help deciding whether an item will suit your space.',
  },
  {
    id: 'care',
    question: 'How should I care for my furniture?',
    answer:
      'Care guidance can differ by material and finish. Refer to the product details for your piece, or contact us for more specific advice.',
  },
  {
    id: 'payments',
    question: 'Which payment methods can I use?',
    answer: 'The payment options available for your order are shown during checkout.',
  },
  {
    id: 'assembly',
    question: 'Do you provide installation or assembly?',
    answer:
      'Assembly requirements can vary by product and delivery location. Contact us before ordering to confirm what applies to your piece.',
  },
  {
    id: 'warranty',
    question: 'Is there a warranty?',
    answer:
      'Warranty terms can vary by product. Contact us with the item you are considering and we will share the relevant details.',
  },
  {
    id: 'made-to-order',
    question: 'Are any pieces made to order?',
    answer:
      'Lead times can vary by piece. Contact us before ordering for the latest information about the item you have in mind.',
  },
]

export const FaqSection: React.FC = () => {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)
  const { settings } = useSiteSettings()
  const { contactInfo } = settings
  const contactHref = contactInfo.email
    ? `mailto:${contactInfo.email}`
    : contactInfo.phone
      ? `tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`
      : null

  return (
    <section id="faq" className="scroll-mt-space-12 bg-surface py-space-12 md:py-space-16">
      <div className="editorial-container">
        <div className="mb-space-8 grid gap-space-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <p className="editorial-label">FAQ</p>
            <h2 className="editorial-heading mt-space-2 text-display-l-mobile lg:text-display-l-desktop">
              Questions, answered plainly.
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="max-w-xl text-body text-muted">
              Didn&apos;t see your question?{' '}
              {contactHref ? (
                <a href={contactHref} className="editorial-link">
                  reach out to us
                </a>
              ) : (
                'Please reach out to us for help.'
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-space-8 lg:grid-cols-12 lg:items-stretch">
          <div className="aspect-[5/4] overflow-hidden rounded-image bg-paper lg:col-span-5 lg:aspect-auto">
            <img
              src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
              alt="Artisan shaping timber in a workshop"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="border-t border-rule lg:col-span-7">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openQuestionId === item.id
              const answerId = `faq-answer-${item.id}`

              return (
                <div key={item.id} className="border-b border-rule">
                  <button
                    type="button"
                    onClick={() => setOpenQuestionId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="flex min-h-11 w-full items-center justify-between gap-space-4 py-space-4 text-left text-body font-semibold text-ink"
                  >
                    {item.question}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform duration-control motion-reduce:transition-none ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={answerId}
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-accordion motion-reduce:transition-none ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-space-6 text-body text-muted">{item.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
