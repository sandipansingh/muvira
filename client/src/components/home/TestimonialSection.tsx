import React from 'react'
import { Quote, Star } from 'lucide-react'
import { TESTIMONIALS } from '../../content/testimonials'

export const TestimonialSection: React.FC = () => {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="editorial-container">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verified Reviews
            </span>
            <h2 className="font-serif text-3xl font-extrabold text-slate-900 sm:text-4xl mt-1">
              What People Say
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
            <div className="flex text-amber-500" aria-label="Five out of five stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span>4.9/5 Average Rating</span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 shadow-xs transition-all hover:bg-white hover:shadow-md"
            >
              <div>
                <Quote className="h-7 w-7 text-slate-400 opacity-60" />
                <blockquote className="mt-3 text-base font-medium leading-relaxed text-slate-800">
                  “{testimonial.quote}”
                </blockquote>
              </div>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-200/60 pt-4">
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.author}, Muvira customer`}
                  className="h-10 w-10 rounded-full object-cover shadow-xs"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{testimonial.author}</p>
                  <p className="text-xs text-slate-500 font-medium">{testimonial.location}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
