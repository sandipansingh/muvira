import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, Home, ShoppingBag } from 'lucide-react'
import { CustomerPageHeading } from '../components/common/CustomerPageHeading'
import { CollectionScene } from '../components/common/CollectionScene'

export const NotFoundPage: React.FC = () => {
  return (
    <main className="empty-journey layout-container py-12 sm:py-16">
      <div className="empty-journey__copy flex flex-col items-start">
        <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center text-muted mb-6 shadow-none">
          <Compass className="h-8 w-8 text-muted stroke-[1.5]" />
        </div>

        <CustomerPageHeading title="A little off the path." />
        <p className="mt-3 text-base text-muted font-normal leading-relaxed">
          The page you are looking for might have been moved, removed, or is temporarily
          unavailable.
        </p>

        <div className="not-found-actions mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link
            to="/shop"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-normal transition-colors"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span>Shop</span>
          </Link>
          <Link
            to="/categories"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-2 rounded-lg border border-line bg-white hover:bg-surface text-ink px-5 py-2.5 text-sm font-normal transition-colors"
          >
            <span>Collections</span>
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-1.5 rounded-lg border border-transparent hover:bg-surface text-muted hover:text-ink px-4 py-2.5 text-sm font-normal transition-colors"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Home</span>
          </Link>
        </div>
      </div>
      <div className="empty-journey__image">
        <CollectionScene preferredSlug="god-idols" />
      </div>
    </main>
  )
}

export default NotFoundPage
