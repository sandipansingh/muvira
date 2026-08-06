import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CreditCard, Mail, Phone, Truck } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPrice } from '../../lib/utils/format'

const shopLinks = [
  { label: 'All collections', to: '/shop' },
  { label: 'Living room', to: '/shop?category=living-room' },
  { label: 'Bedroom', to: '/shop?category=bedroom' },
  { label: 'Dining', to: '/shop?category=dining' },
  { label: 'Office & decor', to: '/shop?category=office-decor' },
]

const accountLinks = [
  { label: 'Cart', to: '/cart' },
  { label: 'Profile', to: '/profile' },
  { label: 'Orders', to: '/orders' },
  { label: 'Sign in', to: '/login' },
]

export const Footer: React.FC = () => {
  const { settings } = useSiteSettings()
  const { contactInfo, shippingRules, storeDescription } = settings
  const phoneHref = contactInfo.phone.replace(/[^\d+]/g, '')

  return (
    <footer className="border-t border-line bg-ivory text-ink">
      <div className="editorial-container py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="editorial-label">Muvira / The studio</p>
            <h2 className="editorial-heading mt-3 max-w-3xl text-4xl leading-[0.95] sm:text-6xl">
              Objects with a quieter point of view.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-ink">
              {storeDescription || 'Considered pieces for rooms that are made to be lived in.'}
            </p>
          </div>
          <div className="border-t border-ink pt-5 lg:border-t-0 lg:border-l lg:pl-8">
            <p className="editorial-label">Speak with the studio</p>
            <p className="mt-3 text-sm leading-6 text-muted-ink">
              Questions about a piece, delivery, or your order? We are here to help.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {contactInfo.email && (
                <a href={`mailto:${contactInfo.email}`} className="editorial-button">
                  <Mail className="h-4 w-4" /> Email us
                </a>
              )}
              {contactInfo.phone && (
                <a href={`tel:${phoneHref}`} className="editorial-button-secondary">
                  <Phone className="h-4 w-4" /> Call the studio
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="my-12 border-t border-line" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr_1fr]">
          <div className="space-y-4">
            <p className="text-xl font-bold tracking-[-0.04em]">Muvira</p>
            <p className="max-w-xs text-sm leading-6 text-muted-ink">
              {storeDescription || 'Hand-finished furniture and objects made for everyday rituals.'}
            </p>
            <div className="space-y-1 text-sm text-muted-ink">
              {contactInfo.email && <p>{contactInfo.email}</p>}
              {contactInfo.phone && <p>{contactInfo.phone}</p>}
              {contactInfo.address && <p>{contactInfo.address}</p>}
            </div>
          </div>

          <div>
            <p className="editorial-label">Shop</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-ink">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition-colors hover:text-cognac">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="editorial-label">Your account</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-ink">
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition-colors hover:text-cognac">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="editorial-label">Delivery, considered</p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-ink">
              <p className="flex gap-3">
                <Truck className="mt-1 h-4 w-4 shrink-0 text-cognac" />
                Free shipping on orders over {formatPrice(shippingRules.freeShippingThresholdPaisa)}
                .
              </p>
              <p>Every order is packed with care and tracked from our studio to your door.</p>
              {contactInfo.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="inline-flex items-center gap-1 text-ink hover:text-cognac"
                >
                  Contact support <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-5 text-xs text-muted-ink sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Muvira. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Secure payments through Razorpay.
          </p>
        </div>
      </div>
    </footer>
  )
}
