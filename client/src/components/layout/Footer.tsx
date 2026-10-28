import React from 'react'
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStoreCollections } from '../../context/StoreCollectionsContext'
import { collectionHref } from '../../lib/utils/collectionPresentation'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { useAuth } from '../../context/AuthContext'
import { useAuthDialog } from '../../context/AuthDialogContext'

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { settings, error } = useSiteSettings()
  const { categories } = useStoreCollections()
  const { isAuthenticated } = useAuth()
  const { openAuth } = useAuthDialog()
  const requestAccount = (event: React.MouseEvent<HTMLAnchorElement>, returnTo?: string) => {
    if (isAuthenticated && returnTo) return
    event.preventDefault()
    openAuth({ mode: 'signin', returnTo })
  }
  const { contactInfo, storeDescription } = settings
  const hasContact =
    !error && Boolean(contactInfo.phone || contactInfo.email || contactInfo.address)
  return (
    <footer id="contact" className={`store-footer ${className}`}>
      <div className="layout-container">
        <div className="store-footer__grid">
          <div>
            <Link to="/" className="brand-lockup w-fit">
              <img
                src="/logo.png"
                alt=""
                width={659}
                height={723}
                className="brand-mark w-auto object-contain"
              />
              <span className="brand-wordmark font-display text-3xl">Muvira</span>
            </Link>
            {storeDescription && (
              <p className="mt-5 max-w-sm text-sm leading-7 text-ink-soft">{storeDescription}</p>
            )}
          </div>
          <div>
            <h2 className="footer-heading">Explore</h2>
            <nav aria-label="Footer catalog" className="footer-links">
              <Link to="/shop">All products</Link>
              <Link to="/categories">Collections</Link>
              <Link to="/shop?sort=newest">New arrivals</Link>
              <Link to="/shop?sort=featured">Featured pieces</Link>
            </nav>
          </div>
          <div>
            <h2 className="footer-heading">Your Muvira</h2>
            <nav aria-label="Footer account" className="footer-links">
              <Link to="/profile" onClick={(event) => requestAccount(event, '/profile')}>
                My account
              </Link>
              <Link to="/orders" onClick={(event) => requestAccount(event, '/orders')}>
                Orders & tracking
              </Link>
              <Link to="/cart">Shopping bag</Link>
              <Link
                to={isAuthenticated ? '/profile' : '/signin'}
                onClick={(event) => requestAccount(event, isAuthenticated ? '/profile' : undefined)}
              >
                Sign in
              </Link>
            </nav>
          </div>
          {hasContact && (
            <div>
              <h2 className="footer-heading">Here to help</h2>
              <ul className="footer-links">
                {contactInfo.email && (
                  <li>
                    <a href={`mailto:${contactInfo.email}`}>
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="email-value" title={contactInfo.email}>
                        {contactInfo.email}
                      </span>
                    </a>
                  </li>
                )}
                {contactInfo.phone && (
                  <li>
                    <a href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`}>
                      <Phone className="h-4 w-4 shrink-0" />
                      {contactInfo.phone}
                    </a>
                  </li>
                )}
                {contactInfo.address && (
                  <li className="mt-2 flex items-start gap-2">
                    <MapPin className="mt-1 h-4 w-4 shrink-0" />
                    <address className="text-sm not-italic leading-6">
                      {contactInfo.address}
                    </address>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        {categories.length > 0 && (
          <nav className="footer-collection-nav" aria-label="Footer collections">
            <span className="eyebrow">Discover more</span>
            <div>
              {categories.map((category) => (
                <Link key={category.id} to={collectionHref(category)}>
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
        <div className="store-footer__bottom">
          <p>© {new Date().getFullYear()} Muvira. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Payments through Razorpay
          </p>
        </div>
      </div>
    </footer>
  )
}
export default Footer
