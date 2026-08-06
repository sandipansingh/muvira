import React from 'react'
import { Quote, Star } from 'lucide-react'
import { TESTIMONIALS } from '../../content/testimonials'

export const TestimonialSection: React.FC = () => {
  return (
    <section className="bg-paper py-16 sm:py-24">
      <div className="editorial-container">
        <div className="flex flex-col justify-between gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="editorial-label">Real homeowners</p>
            <h2 className="editorial-heading mt-3 text-4xl sm:text-5xl">What people say</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-ink">
            <div className="flex text-cognac" aria-label="Five out of five stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span>4.9/5 average rating</span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-3 md:divide-x md:divide-line">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.id}
              className="flex flex-col justify-between border-b border-line py-8 md:border-b-0 md:px-8 first:md:pl-0 last:md:pr-0"
            >
              <div>
                <Quote className="h-6 w-6 text-cognac" />
                <blockquote className="mt-5 font-serif text-xl leading-7 text-ink">
                  “{testimonial.quote}”
                </blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-3">
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.author}, Muvira customer`}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{testimonial.author}</p>
                  <p className="text-xs text-muted-ink">{testimonial.location}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
