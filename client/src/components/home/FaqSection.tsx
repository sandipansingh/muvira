import React, { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccordionItem } from '../common/Accordion'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const FAQ_ITEMS = [
  {
    id: 'timber',
    question: 'What types of wood do you use for your furniture?',
    answer:
      'We work exclusively with kiln-dried, seasoned solid timbers including North Indian Sheesham (Indian Rosewood), Teak, and White Oak. We never use particle board, MDF, or cheap paper veneers.',
  },
  {
    id: 'customization',
    question: 'Can I customize dimensions or wood stain finishes?',
    answer:
      'Yes! Many of our dining tables, beds, and storage units can be tailored to custom dimensions or finished in natural matte, walnut, or honey teak tones. Reach out to our design team with your requirements.',
  },
  {
    id: 'delivery',
    question: 'How does shipping and assembly work across India?',
    answer:
      'We offer complimentary insured doorstep delivery across major metro cities in India. For complex pieces like beds and large dining sets, our white-glove logistics partner includes free in-room assembly.',
  },
  {
    id: 'warranty',
    question: 'What does your 15-year warranty cover?',
    answer:
      'Our warranty covers all structural integrity, joint stability, and solid timber against manufacturing defects, termite infestation, and seasonal wood warping under normal indoor residential use.',
  },
  {
    id: 'maintenance',
    question: 'How should I care for and maintain solid wood furniture?',
    answer:
      'Simply dust with a soft, dry cotton cloth. Avoid harsh chemical sprays. For natural oil finishes, applying a light coat of natural beeswax once a year keeps the wood rich and moisture-resistant.',
  },
  {
    id: 'returns',
    question: 'What is your 30-day home trial and return policy?',
    answer:
      'We want you to love your pieces in your own home. If a standard catalog piece does not suit your space, notify us within 30 days of delivery for a smooth return or exchange.',
  },
  {
    id: 'leadTime',
    question: 'What is the production and delivery lead time for orders?',
    answer:
      'In-stock catalog items ship within 3–5 business days across India. Custom-tailored dimensions or bespoke finish requests are hand-crafted by our master artisans and ship within 2–3 weeks.',
  },
]

export const FaqSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const { settings } = useSiteSettings()
  const { contactInfo } = settings
  const contactHref = contactInfo.email
    ? `mailto:${contactInfo.email}`
    : contactInfo.phone
      ? `tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`
      : null

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <section id="faq" className="editorial-container scroll-mt-24 pb-20 pt-12 sm:pb-24 sm:pt-16">
      {/* Header Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 md:mb-16 items-end">
        <div className="lg:col-span-2 text-left">
          <div className="eyebrow mb-3">FAQ</div>
          <h2 className="text-h1 text-ink max-w-2xl">Questions, Answered Plainly.</h2>
        </div>
        <div className="text-left lg:pl-8 border-l-0 lg:border-l lg:border-border-light">
          <h4 className="text-h4 text-ink mb-1">Didn&apos;t see your question?</h4>
          <p className="text-body-sm text-muted">
            Our workshop team is here to help &mdash; just{' '}
            {contactHref ? (
              <a
                href={contactHref}
                className="text-ink font-bold underline underline-offset-2 transition-colors duration-200"
              >
                reach out
              </a>
            ) : (
              <Link
                to="/#contact"
                className="text-ink font-bold underline underline-offset-2 transition-colors duration-200"
              >
                reach out
              </Link>
            )}{' '}
            and we&apos;ll reply shortly.
          </p>
        </div>
      </div>

      {/* Body Grid: Left Image + Right Accordions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="relative hidden h-[520px] w-full lg:col-span-5 lg:block">
          <img
            src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
            alt="Artisan shaping timber at the workshop"
            className="h-full w-full rounded-[var(--radius-card)] object-cover"
          />
        </div>

        <div className="col-span-1 flex flex-col gap-0 lg:col-span-7">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = activeIndex === index
            const trigger = (
              <div className="group flex w-full items-center justify-between px-0 py-5 text-left">
                <span className="text-body-sm md:text-body font-bold tracking-tight text-ink-soft transition-colors duration-200 group-hover:text-ink">
                  {faq.question}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors duration-200 ml-4 ${
                    isOpen ? 'bg-ink text-white' : 'bg-surface text-ink-soft group-hover:bg-line'
                  }`}
                >
                  <ArrowDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </div>
            )

            return (
              <AccordionItem
                key={faq.id}
                isOpen={isOpen}
                onToggle={() => toggleAccordion(index)}
                trigger={trigger}
                duration={0.25}
                className="overflow-hidden border-b border-[var(--color-line)]"
              >
                <div className="text-body-sm text-muted pb-6 pt-2 leading-relaxed">
                  {faq.answer}
                </div>
              </AccordionItem>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FaqSection
