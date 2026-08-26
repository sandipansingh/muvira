import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, Home, ShoppingBag } from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export const NotFoundPage: React.FC = () => {
  return (
    <main className="min-h-[80vh] flex flex-col justify-center items-center py-16 px-4 bg-paper text-center">
      <div className="max-w-md mx-auto flex flex-col items-center">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: '404 Not Found' }]} />

        <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center text-muted mb-6 shadow-xs">
          <Compass className="h-8 w-8 text-primary stroke-[1.5]" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-muted">Error 404</span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-muted font-normal leading-relaxed">
          The page you are looking for might have been moved, removed, or is temporarily
          unavailable.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink hover:bg-black text-white px-5 py-2.5 text-xs font-normal transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Explore Shop</span>
          </Link>
          <Link
            to="/categories"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white hover:bg-surface text-ink px-5 py-2.5 text-xs font-normal transition-colors"
          >
            <span>Browse Categories</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent hover:bg-surface text-muted hover:text-ink px-4 py-2.5 text-xs font-normal transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </main>
  )
}

export default NotFoundPage
