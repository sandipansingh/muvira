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
]

export const FaqSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0)
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
    <section id="faq" className="pt-gap-section pb-gap-major scroll-mt-24 layout-container">
      {/* Header Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 md:mb-16 items-end">
        <div className="lg:col-span-2 text-left">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
            FAQ
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1] max-w-2xl font-display">
            Questions, Answered Plainly.
          </h2>
        </div>
        <div className="text-left lg:pl-8 border-l-0 lg:border-l lg:border-border-light">
          <h4 className="text-base font-bold text-foreground mb-1">
            Didn&apos;t see your question?
          </h4>
          <p className="text-sm text-neutral-500 leading-relaxed font-normal">
            Our workshop team is here to help &mdash; just{' '}
            {contactHref ? (
              <a
                href={contactHref}
                className="text-neutral-900 font-bold underline hover:text-brand transition-colors duration-200"
              >
                reach out
              </a>
            ) : (
              <Link
                to="/#contact"
                className="text-neutral-900 font-bold underline hover:text-brand transition-colors duration-200"
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
        <div className="hidden lg:block lg:col-span-5 relative w-full h-[520px]">
          <img
            src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
            alt="Artisan shaping timber at the workshop"
            className="w-full h-full object-cover rounded-[32px] shadow-sm"
          />
        </div>

        <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = activeIndex === index
            const trigger = (
              <div className="w-full px-6 py-5 flex items-center justify-between text-left group">
                <span className="text-sm md:text-base font-semibold text-neutral-800 tracking-tight transition-colors duration-200 group-hover:text-neutral-950">
                  {faq.question}
                </span>
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ml-4 ${
                    isOpen
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-800 group-hover:bg-neutral-200'
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
                className="bg-white border border-border-light rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 overflow-hidden"
              >
                <div className="px-6 pb-6 text-sm text-neutral-500 leading-relaxed pt-2 border-t border-border-light/60">
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
