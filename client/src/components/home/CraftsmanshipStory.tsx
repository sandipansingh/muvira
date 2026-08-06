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
    <section className="bg-white py-12 sm:py-16">
      <div className="editorial-container">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-10 lg:p-12 shadow-xs">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85"
                  alt="Artisan shaping timber at the Muvira workshop"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-2 rounded-xl bg-white/90 p-3 text-xs font-semibold text-slate-800 backdrop-blur-md shadow-xs">
                  <span>Made slowly, in small runs</span>
                  <span>15-year warranty</span>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-7 lg:pl-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Our Heritage & Philosophy
                </span>
                <h2 className="font-serif text-3xl font-extrabold text-slate-900 sm:text-5xl mt-2 leading-[1.15]">
                  Furniture made to be lived with, not around.
                </h2>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-slate-600">
                Muvira began with a simple idea: a home should feel calm, considered, and a little
                warmer every year. Every piece starts as a sketch on our workshop floor. Our small
                team of joiners work through prototypes by hand before anything goes into
                production—which is why most of our furniture takes 4–6 weeks to make.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {craftPrinciples.map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xs"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 leading-normal">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
