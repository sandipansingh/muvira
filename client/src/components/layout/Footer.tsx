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
    <footer className="border-t border-slate-200/80 bg-slate-50/90 text-slate-900">
      <div className="editorial-container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Muvira / The Studio
            </span>
            <h2 className="font-serif text-3xl font-extrabold text-slate-900 sm:text-5xl mt-2 leading-[1.15]">
              Objects with a quieter point of view.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              {storeDescription || 'Considered pieces for rooms that are made to be lived in.'}
            </p>
          </div>
          <div className="border-t border-slate-200/80 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Speak with the studio
            </span>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Questions about a piece, delivery, or your order? We are here to help.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {contactInfo.email && (
                <a href={`mailto:${contactInfo.email}`} className="editorial-button">
                  <Mail className="h-4 w-4" />
                  <span>Email us</span>
                </a>
              )}
              {contactInfo.phone && (
                <a href={`tel:${phoneHref}`} className="editorial-button-secondary">
                  <Phone className="h-4 w-4" />
                  <span>Call the studio</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="my-10 border-t border-slate-200/80" />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr_1fr]">
          <div className="space-y-3">
            <p className="text-2xl font-extrabold tracking-tight text-slate-900">Muvira</p>
            <p className="max-w-xs text-sm leading-relaxed text-slate-600">
              {storeDescription || 'Hand-finished furniture and objects made for everyday rituals.'}
            </p>
            <div className="space-y-1 text-xs text-slate-500 font-medium pt-1">
              {contactInfo.email && <p>{contactInfo.email}</p>}
              {contactInfo.phone && <p>{contactInfo.phone}</p>}
              {contactInfo.address && <p>{contactInfo.address}</p>}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shop
            </span>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-600">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition-colors hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your Account
            </span>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-600">
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition-colors hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Delivery, Considered
            </span>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                <span>
                  Free shipping on orders over{' '}
                  {formatPrice(shippingRules.freeShippingThresholdPaisa)}.
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Every order is packed with care and tracked from our studio to your door.
              </p>
              {contactInfo.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline text-xs pt-1"
                >
                  Contact support <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Muvira. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5 font-medium text-slate-600">
            <CreditCard className="h-4 w-4 text-slate-700" /> Secure payments through Razorpay.
          </p>
        </div>
      </div>
    </footer>
  )
}
