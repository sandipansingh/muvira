import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, Home, ShoppingBag } from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { StoreImage } from '../components/common/StoreImage'

export const NotFoundPage: React.FC = () => {
  return (
    <main className="empty-journey layout-container py-12 sm:py-16">
      <div className="empty-journey__copy flex flex-col items-start">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: '404 Not Found' }]} />

        <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center text-muted mb-6 shadow-none">
          <Compass className="h-8 w-8 text-primary stroke-[1.5]" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-muted">Error 404</span>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-ink">A little off the path.</h1>
        <p className="mt-3 text-base text-muted font-normal leading-relaxed">
          The page you are looking for might have been moved, removed, or is temporarily
          unavailable.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-normal transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Explore Shop</span>
          </Link>
          <Link
            to="/categories"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-2 rounded-lg border border-line bg-white hover:bg-surface text-ink px-5 py-2.5 text-sm font-normal transition-colors"
          >
            <span>Browse Categories</span>
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-[var(--tap-target)] items-center justify-center gap-1.5 rounded-lg border border-transparent hover:bg-surface text-muted hover:text-ink px-4 py-2.5 text-sm font-normal transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
      <div className="empty-journey__image">
        <StoreImage
          src="/images/editorial/stone-alcove.webp"
          alt=""
          width={1536}
          height={1024}
          className="h-full w-full object-cover"
        />
      </div>
    </main>
  )
}

export default NotFoundPage
