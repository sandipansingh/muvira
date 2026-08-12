import React from 'react'
import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const quickLinks = [
  { label: 'Shop', to: '/shop' },
  { label: 'Cart', to: '/cart' },
  { label: 'Account', to: '/profile' },
  { label: 'Orders', to: '/orders' },
  { label: 'FAQ', to: '/#faq' },
]

const categoryLinks = [
  { label: 'Living room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
  { label: 'Office & decor', to: '/shop?category=office-decor' },
]

const footerLinkClassName =
  'text-body text-ink transition-colors duration-control hover:text-terracotta'

export const Footer: React.FC = () => {
  const { settings } = useSiteSettings()
  const { contactInfo, storeDescription } = settings
  const phoneHref = contactInfo.phone.replace(/[^\d+]/g, '')

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <footer className="border-t border-rule bg-surface text-ink">
      <div className="editorial-container py-space-12 sm:py-space-16">
        <div className="grid gap-space-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-space-6">
          <section className="border-b border-rule pb-space-8 lg:border-0 lg:pb-0">
            <Link
              to="/"
              className="font-display text-heading-s-mobile font-bold tracking-tight text-ink"
            >
              Muvira
            </Link>
            <p className="mt-space-4 max-w-sm text-body text-muted">
              {storeDescription || 'Hand-finished furniture and objects made for everyday rituals.'}
            </p>
            <div className="mt-space-6 space-y-space-2 text-body">
              {contactInfo.email && (
                <a href={`mailto:${contactInfo.email}`} className={footerLinkClassName}>
                  {contactInfo.email}
                </a>
              )}
              {contactInfo.phone && (
                <a href={`tel:${phoneHref}`} className={`${footerLinkClassName} block`}>
                  {contactInfo.phone}
                </a>
              )}
              {contactInfo.address && (
                <address className="not-italic text-muted">{contactInfo.address}</address>
              )}
            </div>
          </section>

          <section className="order-3 border-b border-rule pb-space-8 lg:order-none lg:border-0 lg:pb-0">
            <h2 className="editorial-label">Quick links</h2>
            <ul className="mt-space-4 space-y-space-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={footerLinkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-4 border-b border-rule pb-space-8 lg:order-none lg:border-0 lg:pb-0">
            <h2 className="editorial-label">Popular highlights</h2>
            <ul className="mt-space-4 space-y-space-3">
              {categoryLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={footerLinkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-2 border-b border-rule pb-space-8 lg:order-none lg:border-0 lg:pb-0">
            <h2 className="editorial-label">Newsletter</h2>
            <p className="mt-space-4 text-body text-muted">
              New pieces and studio notes, occasionally.
            </p>
            <form
              className="mt-space-4 flex gap-space-2"
              aria-label="Newsletter subscription"
              onSubmit={handleNewsletterSubmit}
            >
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Email address"
                className="min-w-0 flex-1 rounded-control border border-rule bg-paper px-space-3 py-space-2 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <button type="button" className="editorial-button px-space-4 py-space-2" disabled>
                Subscribe
              </button>
            </form>
          </section>
        </div>

        <div className="mt-space-12 flex flex-col gap-space-3 border-t border-rule pt-space-6 text-ui text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Muvira. All rights reserved.</p>
          <p className="inline-flex items-center gap-space-2 text-ink">
            <CreditCard className="h-4 w-4" /> Secure payments through Razorpay.
          </p>
        </div>
      </div>
    </footer>
  )
}
