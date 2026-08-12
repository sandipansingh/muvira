import React from 'react'
import { TESTIMONIALS } from '../../content/testimonials'
import { SectionHeader } from '../common/SectionHeader'
import { SeeAllLink } from '../common/SeeAllLink'
import { Marquee } from '../common/Marquee'

const ReviewCard: React.FC<{
  quote: string
  author: string
  location: string
  avatar?: string
}> = ({ quote, author, location, avatar }) => {
  const profileImg =
    avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'

  return (
    <div className="relative h-full w-72 sm:w-80 cursor-pointer overflow-hidden rounded-2xl border border-border-light bg-white p-4.5 shadow-none hover:bg-neutral-50 transition-colors duration-200 flex flex-col justify-between">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <img
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-neutral-100"
            alt={author}
            src={profileImg}
          />
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{author}</p>
            <p className="text-[11px] text-muted font-normal">{location}</p>
          </div>
        </div>
        <p className="text-xs sm:text-[13px] line-clamp-3 text-neutral-700 font-normal leading-relaxed">
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
        rightSlot={<SeeAllLink href="/reviews" label="See All Reviews" />}
      />

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-4 select-none mt-4">
        <Marquee
          pauseOnHover
          className="[--duration:70s]"
          style={{ '--duration': '70s' } as React.CSSProperties}
        >
          {firstRow.map((t) => (
            <ReviewCard
              key={t.id}
              quote={t.quote}
              author={t.author}
              location={t.location}
              avatar={t.avatar}
            />
          ))}
        </Marquee>

        <Marquee
          reverse
          pauseOnHover
          className="[--duration:70s] mt-2"
          style={{ '--duration': '70s' } as React.CSSProperties}
        >
          {secondRow.map((t) => (
            <ReviewCard
              key={`rev-${t.id}`}
              quote={t.quote}
              author={t.author}
              location={t.location}
              avatar={t.avatar}
            />
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
