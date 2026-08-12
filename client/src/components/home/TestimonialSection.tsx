import React from 'react'
import { Link } from 'react-router-dom'
import { TESTIMONIALS } from '../../content/testimonials'

export const TestimonialSection: React.FC = () => {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <div className="editorial-container">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="editorial-label">Customer reviews</span>
            <h2 className="editorial-heading mt-2 text-heading-m-mobile sm:text-heading-m-desktop">
              What People Say
            </h2>
          </div>
          <Link to="/reviews" className="editorial-link shrink-0 text-ui">
            See all reviews
          </Link>
        </div>

        <div
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-3 md:divide-x md:divide-rule"
          aria-label="Customer testimonials"
        >
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.id}
              className="w-[80vw] shrink-0 snap-start pr-6 md:w-auto md:px-8 md:py-1 md:first:pl-0 md:last:pr-0"
            >
              <blockquote className="text-body font-medium text-ink">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6">
                <p className="text-ui font-semibold text-ink">{testimonial.author}</p>
                <p className="mt-1 text-ui text-muted">{testimonial.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
