import React from 'react'
import { Star } from 'lucide-react'
import { TESTIMONIALS } from '../../content/testimonials'
import { SectionHeader } from '../common/SectionHeader'
import { Marquee } from '../common/Marquee'

const ReviewCard: React.FC<{
  quote: string
  author: string
  rating?: number
}> = ({ quote, author, rating = 5 }) => {
  return (
    <div className="relative flex h-full w-72 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-paper p-4 shadow-none transition-colors duration-200 hover:bg-surface sm:w-80">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="truncate text-sm font-bold text-ink">{author}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < (rating || 5) ? 'fill-rating text-rating' : 'text-disabled'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-xs font-normal leading-relaxed text-ink-soft sm:text-[13px] line-clamp-3">
          “{quote}”
        </p>
      </div>
    </div>
  )
}

export const TestimonialSection: React.FC = () => {
  const mid = Math.ceil(TESTIMONIALS.length / 2)
  const firstRow = TESTIMONIALS.slice(0, mid)
  const secondRow = TESTIMONIALS.slice(mid).length > 0 ? TESTIMONIALS.slice(mid) : TESTIMONIALS

  return (
    <section id="testimonials" className="py-gap-section overflow-hidden layout-container">
      <SectionHeader
        title="What Our Customers Say"
        subtitle="Hear from homeowners about their recent Muvira handcrafted pieces"
        mobileLayout="row"
      />

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-4 select-none mt-4">
        <Marquee
          pauseOnHover
          className="[--duration:70s]"
          style={{ '--duration': '70s' } as React.CSSProperties}
        >
          {firstRow.map((t) => (
            <ReviewCard key={t.id} quote={t.quote} author={t.author} rating={t.rating} />
          ))}
        </Marquee>

        <Marquee
          reverse
          pauseOnHover
          className="[--duration:70s] mt-2"
          style={{ '--duration': '70s' } as React.CSSProperties}
        >
          {secondRow.map((t) => (
            <ReviewCard key={`rev-${t.id}`} quote={t.quote} author={t.author} rating={t.rating} />
          ))}
        </Marquee>

        {/* Gradient edge masks */}
        <div className="from-white pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r z-10" />
        <div className="from-white pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l z-10" />
      </div>
    </section>
  )
}

export default TestimonialSection
