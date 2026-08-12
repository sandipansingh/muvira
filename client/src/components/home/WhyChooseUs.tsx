import React from 'react'
import { HandHeart, Sofa, Truck } from 'lucide-react'

const values = [
  {
    icon: HandHeart,
    title: 'Made with care',
    description: 'Thoughtful materials and details, considered from the start.',
  },
  {
    icon: Truck,
    title: 'Delivery you can plan for',
    description: 'A clearer path from choosing your piece to welcoming it home.',
  },
  {
    icon: Sofa,
    title: 'Built for everyday life',
    description: 'Furniture made for the routines that make a home yours.',
  },
]

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="bg-surface py-12 sm:py-16">
      <div className="editorial-container">
        <div className="sm:text-center">
          <span className="editorial-label">Why choose us</span>
          <h2 className="editorial-heading mt-2 text-heading-m-mobile sm:text-heading-m-desktop">
            Considered for real homes
          </h2>
          <p className="mt-4 text-body text-muted">
            A quieter way to choose furniture for the spaces you use every day.
          </p>
        </div>

        <div className="mt-8 divide-y divide-rule lg:grid lg:grid-cols-3 lg:divide-y-0">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 py-6 first:pt-0 last:pb-0 lg:block lg:px-6 lg:py-0 lg:text-center"
            >
              <Icon className="h-6 w-6 shrink-0 text-ink lg:mx-auto" aria-hidden="true" />
              <div className="lg:mt-4">
                <h3 className="font-display text-heading-s-mobile font-semibold text-ink sm:text-heading-s-desktop">
                  {title}
                </h3>
                <p className="mt-2 text-body text-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
