import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { useToast } from '../../context/ToastContext'

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const location = useLocation()
  const { settings } = useSiteSettings()
  const { contactInfo, storeDescription } = settings
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    setSubscribed(true)
    setEmail('')
    showToast('Thank you for subscribing to Muvira Studio notes.', 'success')
    setTimeout(() => setSubscribed(false), 5000)
  }

  const getHref = (href: string) => {
    if (href.startsWith('/#')) {
      return location.pathname === '/' ? href.replace('/', '') : href
    }
    return href
  }

  const phoneNum = contactInfo.phone || '+91 98300 12345'
  const emailAddress = contactInfo.email || 'care@muvira.in'
  const storeAddress =
    contactInfo.address || '77 Park Street, Heritage Crafts Arcade, Kolkata, West Bengal - 700016'

  const socialLinks = [
    {
      name: 'Instagram',
      href: 'https://instagram.com',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <title>Instagram</title>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <title>Facebook</title>
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
        </svg>
      ),
    },
    {
      name: 'Pinterest',
      href: 'https://pinterest.com',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <title>Pinterest</title>
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.41 7.61 11.162-.102-.947-.19-2.4 0-3.434.17-.929 1.107-4.686 1.107-4.686s-.284-.569-.284-1.414c0-1.323.766-2.312 1.72-2.312.81 0 1.2.61 1.2 1.342 0 .814-.518 2.03-.785 3.16-.223.947.472 1.72 1.402 1.72 1.684 0 2.978-1.782 2.978-4.356 0-2.277-1.637-3.87-3.97-3.87-2.709 0-4.3 2.03-4.3 4.137 0 .817.317 1.692.71 2.167.078.093.09.174.067.27-.073.303-.236.96-.268 1.09-.043.17-.142.206-.328.12-1.228-.57-1.996-2.357-1.996-3.79 0-3.085 2.242-5.918 6.467-5.918 3.393 0 6.03 2.418 6.03 5.649 0 3.37-2.122 6.084-5.068 6.084-1.01 0-1.96-.525-2.285-1.147l-.625 2.378c-.227.872-.843 1.966-1.258 2.639 1 .3 2.06.463 3.16.463 6.62 0 11.986-5.368 11.986-11.987C24.017 5.367 18.63 0 12.017 0z" />
        </svg>
      ),
    },
    {
      name: 'WhatsApp',
      href: 'https://wa.me/919830012345',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <title>WhatsApp</title>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
  ]

  return (
    <footer
      id="contact"
      className={`bg-[#F9F9F9] text-neutral-800 pt-16 pb-12 relative overflow-hidden font-sans border-t border-neutral-200/80 ${className}`}
    >
      <div className="layout-container">
        {/* Top Bar: Slogan + Socials & Newsletter */}
        <div className="flex flex-col md:flex-row items-stretch gap-8 md:gap-0 pb-12 border-b border-neutral-200">
          {/* Left Slogan & Socials */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 flex-1 pr-0 md:pr-12">
            <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight max-w-[280px]">
              Solid timber crafted for real homes
            </h3>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-neutral-100 flex items-center justify-center transition-all duration-300 border border-neutral-100 cursor-pointer"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px bg-neutral-200 self-stretch my-2" />
          <div className="block md:hidden h-px bg-neutral-200 w-full" />

          {/* Right Newsletter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 flex-1 pl-0 md:pl-12">
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
              Join our
              <br className="hidden sm:inline" /> Newsletter
            </h3>
            <div className="w-full max-w-[320px]">
              {subscribed ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full py-2.5 px-4 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Subscribed successfully!</span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex items-center bg-white border border-neutral-200 rounded-full p-1 pl-4 w-full shadow-xs"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter your e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none outline-none text-base text-neutral-800 placeholder-neutral-400 flex-grow min-w-0"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer shadow-xs"
                    aria-label="Subscribe to newsletter"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 4-Column Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pt-16 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5 w-max select-none">
              <img src="/logo.png" alt="Muvira" className="h-7 w-auto object-contain shrink-0" />
              <span className="translate-y-[3px] font-display text-lg lg:text-xl font-bold text-neutral-900 tracking-[0.16em] uppercase leading-none">
                Muvira
              </span>
            </Link>
            <p className="text-sm text-neutral-700 font-normal leading-relaxed max-w-md">
              {storeDescription ||
                'Muvira celebrates heirloom timber craft and bespoke Indian woodworking. Every piece is hand-hewn by master artisans for homes built to be lived in.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
              Contact
            </h4>
            <ul className="flex flex-col gap-3 text-sm text-neutral-800 font-medium">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <a
                  href={`tel:${phoneNum.replace(/[^\d+]/g, '')}`}
                  className="hover:text-brand transition-colors duration-200"
                >
                  {phoneNum}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                <a
                  href={`mailto:${emailAddress}`}
                  className="hover:text-brand transition-colors duration-200 break-all"
                >
                  {emailAddress}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed text-neutral-600">{storeAddress}</span>
              </li>
              <li className="pt-2 border-t border-neutral-200/60 mt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                  Studio Hours
                </div>
                <div className="text-xs text-neutral-800 font-semibold normal-case">
                  Monday – Saturday: 10:00 AM – 7:00 PM IST
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Links & Highlights */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2 lg:col-span-5 lg:grid-cols-5">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Quick Links
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-neutral-800 font-medium">
                {[
                  { name: 'Home', href: '/' },
                  { name: 'Shop All', href: '/shop' },
                  { name: 'My Cart', href: '/cart' },
                  { name: 'Customer Reviews', href: '/reviews' },
                  { name: 'FAQs', href: '/#faq' },
                  { name: 'Track Orders', href: '/orders' },
                ].map((link) => (
                  <li key={link.name}>
                    <Link
                      to={getHref(link.href)}
                      className="hover:text-brand hover:translate-x-1 transition-all duration-200 inline-block text-xs sm:text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Popular Collections
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-neutral-800 font-medium">
                {[
                  { name: 'Living Room Collection', href: '/shop?category=living-room' },
                  { name: 'Solid Wood Bed Frames', href: '/shop?category=bedroom' },
                  { name: 'Dining Tables & Chairs', href: '/shop?category=dining' },
                  { name: 'Office Desks & Storage', href: '/shop?category=office-decor' },
                  { name: 'Hand-Carved Accents', href: '/shop' },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="hover:text-brand hover:translate-x-1 transition-all duration-200 inline-block text-xs sm:text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Legal / Policy Bar */}
        <div className="pt-8 border-t border-neutral-200 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-center sm:text-left">
            <p className="text-xs font-medium text-neutral-800">
              © {new Date().getFullYear()} Muvira. All rights reserved.
            </p>
            <span className="hidden sm:inline text-neutral-300 text-xs">|</span>
            <p className="text-xs font-medium text-neutral-600">
              GSTIN: <span className="font-semibold text-neutral-800">19AAACM1234F1Z5</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-500">
            <Link to="/#faq" className="hover:text-brand transition-colors duration-200">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-neutral-300">|</span>
            <Link to="/#faq" className="hover:text-brand transition-colors duration-200">
              Terms of Service
            </Link>
            <span className="hidden sm:inline text-neutral-300">|</span>
            <Link to="/#faq" className="hover:text-brand transition-colors duration-200">
              Cancellation & Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
