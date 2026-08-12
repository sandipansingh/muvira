import React from 'react'
import { TESTIMONIALS } from '../content/testimonials'

export const ReviewsPage: React.FC = () => {
  return (
    <main className="editorial-page py-12 sm:py-16">
      <section className="editorial-container" aria-labelledby="reviews-heading">
        <header className="max-w-2xl">
          <span className="editorial-label">Customer reviews</span>
          <h1
            id="reviews-heading"
            className="editorial-heading mt-2 text-display-l-mobile sm:text-display-l-desktop"
          >
            What People Say
          </h1>
        </header>

        <div className="mt-8 divide-y divide-rule border-y border-rule">
          {TESTIMONIALS.map((testimonial) => (
            <figure key={testimonial.id} className="py-8 first:pt-8 last:pb-8">
              <blockquote className="max-w-3xl text-body-l-mobile text-ink sm:text-body-l-desktop">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-4">
                <p className="text-ui font-semibold text-ink">{testimonial.author}</p>
                <p className="mt-1 text-ui text-muted">{testimonial.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  )
}
