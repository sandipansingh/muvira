import React from 'react'
import { Star } from 'lucide-react'
import { TESTIMONIALS } from '../content/testimonials'
import { SectionHeader } from '../components/common/SectionHeader'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

export const ReviewsPage: React.FC = () => {
  return (
    <main className="editorial-page py-8 sm:py-10">
      <div className="editorial-container">
        {/* Breadcrumb */}
        <Breadcrumbs
          className="mb-6"
          items={[{ label: 'Home', href: '/' }, { label: 'Customer Reviews' }]}
        />

        <SectionHeader
          badge="Verified Homeowners"
          title="What Our Customers Say"
          subtitle="Real experiences from homes furnished with Muvira solid wood pieces across India."
        />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.id} className="panel flex flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-1 text-rating mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <blockquote className="body-copy text-sm sm:text-base">
                  “{testimonial.quote}”
                </blockquote>
              </div>
              <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-line">
                <img
                  src={
                    testimonial.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'
                  }
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-line"
                />
                <div>
                  <p className="text-sm font-normal text-[var(--color-ink)]">
                    {testimonial.author}
                  </p>
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
