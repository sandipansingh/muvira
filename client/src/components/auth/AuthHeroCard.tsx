import React from 'react'
import { Link } from 'react-router-dom'

interface AuthHeroCardProps {
  className?: string
}

export const AuthHeroCard: React.FC<AuthHeroCardProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-sm ${className}`}
    >
      <img
        src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85"
        alt="Muvira Interior Living Space"
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/30 pointer-events-none" />

      {/* Brand Overlay at Top */}
      <div className="relative z-10 flex w-full justify-center pt-8 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          aria-label="Back to home"
        >
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Muvira
          </span>
        </Link>
      </div>
    </div>
  )
}
