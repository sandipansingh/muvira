import React from 'react'
import { Link } from 'react-router-dom'
import { STORE_NAME } from '../../lib/constants'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { Mail, Phone, MapPin } from 'lucide-react'

export const Footer: React.FC = () => {
  const { settings } = useSiteSettings()
  const contactInfo = settings?.contactInfo

  return (
    <footer className="bg-[var(--text)] text-[#d9d0c5] border-t border-[#463f38]">
      {/* Top section: Main links */}
      <div className="max-w-[1240px] mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* About column */}
        <div className="flex flex-col gap-4 text-left">
          <h2 className="text-xl font-semibold tracking-[-0.1px] text-white uppercase font-redhatMedium">
            {STORE_NAME}
          </h2>
          <p className="text-xs md:text-sm text-[#b6ab9e] leading-relaxed tracking-wide">
            {settings?.storeDescription ||
              'Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home.'}
          </p>
          {/* Social profiles intentionally omitted — add real brand links when available */}
        </div>

        {/* Customer Support */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-sm font-semibold tracking-widest text-white uppercase border-l-2 border-[var(--accent-gold)] pl-2.5 font-redhatMedium">
            Customer Support
          </h3>
          <ul className="flex flex-col gap-2.5 text-xs md:text-sm text-secondary400">
            <li>
              <Link
                to="/orders"
                className="hover:text-[var(--accent-gold-light)] transition-colors"
              >
                Track Order
              </Link>
            </li>
            <li>
              <span className="text-secondary400">Shipping Policy</span>
            </li>
            <li>
              <span className="text-secondary400">Cancellation &amp; Returns</span>
            </li>
            <li>
              <span className="text-secondary400">FAQs</span>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-sm font-semibold tracking-widest text-white uppercase border-l-2 border-[var(--accent-gold)] pl-2.5 font-redhatMedium">
            Quick Links
          </h3>
          <ul className="flex flex-col gap-2.5 text-xs md:text-sm text-secondary400">
            <li>
              <Link
                to="/products"
                className="hover:text-[var(--accent-gold-light)] transition-colors"
              >
                All Products
              </Link>
            </li>
            <li>
              <Link
                to="/categories"
                className="hover:text-[var(--accent-gold-light)] transition-colors"
              >
                Shop By Category
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className="hover:text-[var(--accent-gold-light)] transition-colors"
              >
                My Profile
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-[var(--accent-gold-light)] transition-colors">
                Shopping Cart
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-sm font-semibold tracking-widest text-white uppercase border-l-2 border-[var(--accent-gold)] pl-2.5 font-redhatMedium">
            Contact Us
          </h3>
          <ul className="flex flex-col gap-3.5 text-xs md:text-sm text-secondary400">
            {contactInfo ? (
              <>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-[var(--accent-gold)] shrink-0" />
                  <span>{contactInfo.address}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                  <span>{contactInfo.phone}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                  <span>{contactInfo.email}</span>
                </li>
              </>
            ) : (
              <li className="text-[#6b6460] text-xs italic">Loading…</li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom section: copyright */}
      <div className="border-t border-[#463f38] bg-black/40 py-6 text-center text-xs text-[#91857a]">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider">
            <a href="#" className="hover:text-[var(--accent-gold-light)] transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-[var(--accent-gold-light)] transition-colors">
              Terms of Use
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
