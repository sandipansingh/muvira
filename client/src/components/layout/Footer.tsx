import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { useToast } from '../../context/ToastContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

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
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.688 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z" />
        </svg>
      ),
    },
    {
      name: 'Pinterest',
      href: 'https://pinterest.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ]

  return (
    <footer
      id="contact"
      className={`bg-surface text-ink-soft pt-16 pb-12 relative overflow-hidden font-sans border-t border-line ${className}`}
    >
      <div className="layout-container">
        {/* Top Bar: Slogan + Socials & Newsletter */}
        <div className="flex flex-col md:flex-row items-stretch gap-8 md:gap-0 pb-12 border-b border-line">
          {/* Left Slogan & Socials */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 flex-1 pr-0 md:pr-12">
            <h3 className="text-2xl font-normal text-ink tracking-tight leading-tight max-w-[280px]">
              Solid timber crafted for real homes
            </h3>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-[var(--radius-control)] bg-paper text-ink-soft shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-surface flex items-center justify-center transition-all duration-300 border border-line cursor-pointer"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px bg-line self-stretch my-2" />
          <div className="block md:hidden h-px bg-line w-full" />

          {/* Right Newsletter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 flex-1 pl-0 md:pl-12">
            <h3 className="text-2xl font-normal text-ink tracking-tight leading-tight">
              Join our
              <br className="hidden sm:inline" /> Newsletter
            </h3>
            <div className="w-full max-w-[320px]">
              {subscribed ? (
                <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-accent/20 bg-accent-soft px-4 py-2.5 text-xs font-normal text-accent">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="leading-none">Subscribed successfully!</span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex items-center bg-paper border border-line rounded-[var(--radius-control)] p-1 pl-4 w-full shadow-xs"
                >
                  <Input
                    type="email"
                    required
                    placeholder="Enter your e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none outline-none text-base text-ink-soft placeholder:text-muted flex-grow min-w-0 focus:ring-0"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="icon"
                    className="shrink-0"
                    aria-label="Subscribe to newsletter"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Button>
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
              <span className="translate-y-[3px] font-display text-lg lg:text-xl font-normal text-ink tracking-wider uppercase leading-none">
                Muvira
              </span>
            </Link>
            <p className="text-sm text-ink-soft font-normal leading-relaxed max-w-md">
              {storeDescription ||
                'Muvira celebrates heirloom timber craft and bespoke Indian woodworking. Every piece is hand-hewn by master artisans for homes built to be lived in.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h4 className="text-xs font-normal uppercase tracking-wider text-ink">Contact</h4>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft font-normal">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-muted" />
                <a
                  href={`tel:${phoneNum.replace(/[^\d+]/g, '')}`}
                  className="hover:text-primary hover:underline transition-colors duration-200 leading-none"
                >
                  {phoneNum}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-muted" />
                <a
                  href={`mailto:${emailAddress}`}
                  className="break-all leading-none transition-colors duration-200 hover:text-primary hover:underline"
                >
                  {emailAddress}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <span className="text-xs leading-relaxed text-ink-soft">{storeAddress}</span>
              </li>
              <li className="pt-2 border-t border-line/60 mt-1">
                <div className="text-xs font-normal uppercase tracking-wider text-muted mb-0.5">
                  Studio Hours
                </div>
                <div className="text-xs text-ink font-normal normal-case">
                  Monday – Saturday: 10:00 AM – 7:00 PM IST
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Links & Highlights */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2 lg:col-span-5 lg:grid-cols-5">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h4 className="text-xs font-normal uppercase tracking-wider text-ink">Quick Links</h4>
              <ul className="flex flex-col gap-2.5 text-sm text-ink-soft font-normal">
                {[
                  { name: 'Home', href: '/' },
                  { name: 'Shop All', href: '/shop' },
                  { name: 'Browse Categories', href: '/categories' },
                  { name: 'My Cart', href: '/cart' },
                  { name: 'Customer Reviews', href: '/reviews' },
                  { name: 'FAQs', href: '/#faq' },
                  { name: 'Track Orders', href: '/orders' },
                ].map((link) => (
                  <li key={link.name}>
                    <Link
                      to={getHref(link.href)}
                      className="hover:text-primary hover:underline transition-all duration-200 inline-block text-xs sm:text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-4">
              <h4 className="text-xs font-normal uppercase tracking-wider text-ink">
                Popular Collections
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-ink-soft font-normal">
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
                      className="hover:text-primary hover:underline transition-all duration-200 inline-block text-xs sm:text-sm"
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
        <div className="pt-8 border-t border-line flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-center sm:text-left">
            <p className="text-xs font-normal text-ink-soft">
              © {new Date().getFullYear()} Muvira. All rights reserved.
            </p>
            <span className="hidden sm:inline text-disabled text-xs">|</span>
            <p className="text-xs font-normal text-ink-soft">
              GSTIN: <span className="font-normal text-ink">19RTKPS1769E1ZQ</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-normal text-muted">
            <Link
              to="/#faq"
              className="hover:text-primary hover:underline transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-disabled">|</span>
            <Link
              to="/#faq"
              className="hover:text-primary hover:underline transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <span className="hidden sm:inline text-disabled">|</span>
            <Link
              to="/#faq"
              className="hover:text-primary hover:underline transition-colors duration-200"
            >
              Cancellation & Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
