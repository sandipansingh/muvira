import React from 'react'
import { Star, Quote } from 'lucide-react'
import { MOCK_TESTIMONIALS } from '../../mock/mockData'

export const TestimonialSection: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#18181B] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
              Real Homeowners
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-1">
              What People Say
            </h2>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-2 text-xs text-zinc-400">
            <div className="flex items-center text-[#C88D35]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-[#C88D35]" />
              ))}
            </div>
            <span className="font-semibold text-white">4.9/5 Average Rating</span>
            <span>(2,400+ verified reviews)</span>
          </div>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-[#242428] p-8 rounded-2xl border border-zinc-800 flex flex-col justify-between relative shadow-lg hover:border-[#C88D35]/50 transition-colors"
            >
              <Quote className="w-8 h-8 text-[#C88D35]/40 mb-4" />

              <p className="text-sm text-zinc-300 leading-relaxed italic mb-8 font-light">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                <img
                  src={t.avatar}
                  alt={t.author}
                  className="w-11 h-11 rounded-full object-cover border border-zinc-700"
                />
                <div>
                  <h5 className="font-serif font-bold text-sm text-white">{t.author}</h5>
                  <p className="text-xs text-zinc-400">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
