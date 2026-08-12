import React from 'react'
import { Award, ShieldCheck, Truck } from 'lucide-react'
import { SectionHeader } from '../common/SectionHeader'

export const WhyChooseUs: React.FC = () => {
  const features = [
    {
      icon: <Award className="w-14 h-14 stroke-[1.25]" />,
      title: '100% Solid Timber',
      description:
        'Responsibly sourced solid sheesham, oak, and teak. Built without cheap veneers.',
    },
    {
      icon: <ShieldCheck className="w-14 h-14 stroke-[1.25]" />,
      title: '15-Year Warranty',
      description:
        'Heirloom construction with traditional mortise-and-tenon joinery designed to last generations.',
    },
    {
      icon: <Truck className="w-14 h-14 stroke-[1.25]" />,
      title: 'White-Glove Delivery',
      description: 'Safe doorstep delivery with professional in-room assembly and zero hassle.',
    },
  ]

  return (
    <section id="why-choose-us" className="py-gap-section scroll-mt-24 bg-white layout-container">
      <SectionHeader
        title="Why Choose Muvira?"
        subtitle="We provide exceptional solid wood furniture with meticulous attention to every detail"
        align="center"
        className="mb-6 md:mb-16"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 max-w-[1100px] mx-auto">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="flex flex-row lg:flex-col items-center lg:items-center text-left lg:text-center group bg-neutral-50/60 lg:bg-transparent p-5 lg:p-0 rounded-2xl lg:rounded-none border border-neutral-100 lg:border-none gap-4 lg:gap-0"
          >
            <div className="text-neutral-800 group-hover:text-brand transition-all duration-300 transform group-hover:scale-105 ease-out lg:mb-5 shrink-0 p-2.5 lg:p-0 bg-white lg:bg-transparent rounded-xl shadow-xs lg:shadow-none">
              {React.cloneElement(feature.icon, {
                className: 'w-6 h-6 lg:w-14 lg:h-14 stroke-[1.5] lg:stroke-[1.25]',
              })}
            </div>
            <div>
              <h3 className="text-base lg:text-2xl font-bold text-foreground tracking-tight lg:mb-2.5">
                {feature.title}
              </h3>
              <p className="text-muted text-xs lg:text-sm font-normal leading-relaxed max-w-[280px] mt-0.5 lg:mt-0">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default WhyChooseUs
