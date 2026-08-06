import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Truck, RotateCcw, CreditCard } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#18181B] text-zinc-300 font-sans border-t border-zinc-800">
      {/* Guarantees Strip */}
      <div className="border-b border-zinc-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-zinc-800/80 rounded-2xl text-[#C88D35]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm">15-Year Solid Timber Warranty</h5>
              <p className="text-xs text-zinc-400">On every frame, every single order</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-zinc-800/80 rounded-2xl text-[#C88D35]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm">Free White-Glove Delivery</h5>
              <p className="text-xs text-zinc-400">On orders over ₹1,000</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-zinc-800/80 rounded-2xl text-[#C88D35]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-semibold text-white text-sm">30-Day In-Home Trial</h5>
              <p className="text-xs text-zinc-400">If it's not right, send it back seamlessly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="font-serif text-3xl font-bold text-white tracking-tight">Muvira</h4>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              Handcrafted furniture and home decor built for life. Crafted from FSC-certified solid
              timbers by master joiners, designed to bring warmth and timeless elegance to modern
              homes.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-zinc-400">
              <CreditCard className="w-4 h-4 text-[#C88D35]" />
              <span>Razorpay Secured • PCI-DSS 256-Bit Encrypted</span>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-3">
            <h5 className="font-serif text-base font-semibold text-white">Shop</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link
                  to="/shop?category=living-room"
                  className="hover:text-white transition-colors"
                >
                  Sofas & Sectionals
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=living-room"
                  className="hover:text-white transition-colors"
                >
                  Accent Chairs
                </Link>
              </li>
              <li>
                <Link to="/shop?category=dining" className="hover:text-white transition-colors">
                  Dining Tables
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=office-decor"
                  className="hover:text-white transition-colors"
                >
                  Storage & Shelves
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=office-decor"
                  className="hover:text-white transition-colors"
                >
                  Lighting & Decor
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h5 className="font-serif text-base font-semibold text-white">Company</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Craftsmanship
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Sustainability
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Journal & Press
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h5 className="font-serif text-base font-semibold text-white">Support</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Help Center & FAQs
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 Muvira India. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-300 cursor-pointer">Shipping Policy</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
