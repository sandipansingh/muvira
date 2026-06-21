import React from 'react';
import { Link } from 'react-router-dom';
import { STORE_NAME } from '../../lib/constants';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-darkColor text-[#E7E7E7] border-t border-secondary600/30">
      {/* Top section: Main links */}
      <div className="max-w-[1240px] mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* About column */}
        <div className="flex flex-col gap-4 text-left">
          <h2 className="text-xl font-bold tracking-wider text-white uppercase font-montserrat">{STORE_NAME}</h2>
          <p className="text-xs md:text-sm text-secondary400 leading-relaxed">
            Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home.
          </p>
          <div className="flex items-center gap-3.5 mt-2">
            <a href="#" className="hover:text-primaryBg transition-colors" aria-label="Facebook">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
            </a>
            <a href="#" className="hover:text-primaryBg transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
            <a href="#" className="hover:text-primaryBg transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
          </div>
        </div>

        {/* Customer Support */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase border-l-2 border-primaryBg pl-2.5 font-montserrat">
            Customer Support
          </h3>
          <ul className="flex flex-col gap-2.5 text-xs md:text-sm text-secondary400">
            <li>
              <Link to="/orders" className="hover:text-primaryBg transition-colors">
                Track Order
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-primaryBg transition-colors">
                Shipping Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primaryBg transition-colors">
                Cancellation & Returns
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primaryBg transition-colors">
                FAQs
              </a>
            </li>
          </ul>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase border-l-2 border-primaryBg pl-2.5 font-montserrat">
            Quick Links
          </h3>
          <ul className="flex flex-col gap-2.5 text-xs md:text-sm text-secondary400">
            <li>
              <Link to="/products" className="hover:text-primaryBg transition-colors">
                All Products
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-primaryBg transition-colors">
                Shop By Category
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-primaryBg transition-colors">
                My Profile
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-primaryBg transition-colors">
                Shopping Cart
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4 text-left font-roboto">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase border-l-2 border-primaryBg pl-2.5 font-montserrat">
            Contact Us
          </h3>
          <ul className="flex flex-col gap-3.5 text-xs md:text-sm text-secondary400">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-primaryBg shrink-0" />
              <span>12 Park Street, Flat 4B, Kolkata, West Bengal, 700016</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-primaryBg shrink-0" />
              <span>+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-primaryBg shrink-0" />
              <span>support@muvira.com</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom section: copyright */}
      <div className="border-t border-secondary600/30 bg-black/30 py-6 text-center text-xs text-secondary500">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {STORE_NAME} Retail Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider text-secondary500">
            <a href="#" className="hover:text-primaryBg transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-primaryBg transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
