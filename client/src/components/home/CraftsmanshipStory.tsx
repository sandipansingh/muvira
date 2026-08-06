import React from 'react'
import { Award, Hammer, HeartHandshake, Leaf } from 'lucide-react'

const craftPrinciples = [
  {
    icon: Leaf,
    title: 'Sustainability first',
    text: '100% FSC-certified solid oak, sheesham & walnut.',
  },
  {
    icon: Hammer,
    title: 'Honest hand craft',
    text: 'Solid joinery, no drop-shipping, no unnamed factories.',
  },
  { icon: Award, title: 'Made to last', text: 'We design for repair, not replacement.' },
  {
    icon: HeartHandshake,
    title: 'Free in-home trial',
    text: '30 days in your home with zero hassle returns.',
  },
]

export const CraftsmanshipStory: React.FC = () => {
  return (
    <section className="bg-ivory py-16 sm:py-24">
      <div className="editorial-container grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
        <div className="border-y border-line py-3">
          <img
            src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
            alt="Artisan shaping timber at the Muvira workshop"
            className="aspect-[4/5] w-full object-cover sm:aspect-[5/6]"
          />
          <p className="flex justify-between gap-4 py-3 text-xs text-muted-ink">
            <span>Made slowly, in small runs</span>
            <span>15-year warranty</span>
          </p>
        </div>

        <div>
          <p className="editorial-label">Our heritage & philosophy</p>
          <h2 className="editorial-heading mt-4 max-w-2xl text-4xl leading-[0.98] sm:text-6xl">
            Furniture made to be lived with, not around.
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-ink sm:text-base">
            Muvira began with a simple idea: a home should feel calm, considered, and a little
            warmer every year. Every piece starts as a sketch on our workshop floor in Jaipur and
            Bristol. Our small team of joiners work through prototypes by hand before anything goes
            into production—which is why most of our furniture takes 4–6 weeks to make.
          </p>

          <div className="mt-10 grid gap-x-8 sm:grid-cols-2">
            {craftPrinciples.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 border-t border-line py-4">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cognac" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-ink">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
