import React from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { TESTIMONIALS } from '../content/testimonials'
import { SectionHeader } from '../components/common/SectionHeader'

export const ReviewsPage: React.FC = () => {
  return (
    <main className="editorial-page py-10 sm:py-16">
      <div className="editorial-container">
        {/* Breadcrumb */}
        <nav
          className="mb-8 flex items-center gap-2 text-xs font-semibold text-neutral-400"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="hover:text-ink hover:underline transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="font-bold text-foreground">Customer Reviews</span>
        </nav>

        <SectionHeader
          badge="Verified Homeowners"
          title="What Our Customers Say"
          subtitle="Real experiences from homes furnished with Muvira solid wood pieces across India."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.id} className="panel flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <blockquote className="body-copy text-sm sm:text-base">
                  “{testimonial.quote}”
                </blockquote>
              </div>
              <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-neutral-100">
                <img
                  src={
                    testimonial.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'
                  }
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-100"
                />
                <div>
                  <p className="text-sm font-bold text-[var(--color-ink)]">{testimonial.author}</p>
                  <p className="text-xs font-normal text-[var(--color-muted)]">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default ReviewsPage
