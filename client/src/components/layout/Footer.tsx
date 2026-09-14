import React from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { settings, error } = useSiteSettings()
  const { contactInfo, storeDescription } = settings
  const hasContact = Boolean(contactInfo.phone || contactInfo.email || contactInfo.address)

  return (
    <footer
      id="contact"
      className={`relative overflow-hidden border-t border-line bg-surface pb-12 pt-12 font-sans text-ink-soft ${className}`}
    >
      <div className="layout-container">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex w-max select-none items-center gap-2.5">
              <img src="/logo.png" alt="Muvira" className="h-7 w-auto shrink-0 object-contain" />
              <span className="translate-y-[2px] font-display text-xl leading-none tracking-wider text-ink uppercase">
                Muvira
              </span>
            </Link>
            {storeDescription && (
              <p className="max-w-md text-sm leading-relaxed text-ink">{storeDescription}</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">Contact</h2>
            {error && <p className="text-sm text-muted">Contact details are unavailable.</p>}
            {!error && !hasContact && (
              <p className="text-sm text-muted">Contact details have not been published.</p>
            )}
            {!error && hasContact && (
              <ul className="flex flex-col gap-3 text-sm">
                {contactInfo.phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-muted" />
                    <a
                      href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`}
                      className="transition-colors hover:text-primary hover:underline"
                    >
                      {contactInfo.phone}
                    </a>
                  </li>
                )}
                {contactInfo.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-muted" />
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="break-all transition-colors hover:text-primary hover:underline"
                    >
                      {contactInfo.email}
                    </a>
                  </li>
                )}
                {contactInfo.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <span>{contactInfo.address}</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">Browse</h2>
            <nav className="flex flex-col items-start gap-2.5 text-sm" aria-label="Footer">
              <Link to="/" className="transition-colors hover:text-primary hover:underline">
                Home
              </Link>
              <Link to="/shop" className="transition-colors hover:text-primary hover:underline">
                Shop all
              </Link>
              <Link
                to="/categories"
                className="transition-colors hover:text-primary hover:underline"
              >
                Categories
              </Link>
              <Link to="/cart" className="transition-colors hover:text-primary hover:underline">
                Cart
              </Link>
              <Link to="/orders" className="transition-colors hover:text-primary hover:underline">
                Orders
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <p className="text-center text-xs text-ink-soft sm:text-left">
            © {new Date().getFullYear()} Muvira. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
