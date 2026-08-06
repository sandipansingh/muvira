import React from 'react'

const trustFacts = [
  ['2.4k+', 'Happy homes furnished'],
  ['340+', 'Handcrafted designs'],
  ['15yr', 'Solid wood warranty'],
  ['100%', 'Responsibly sourced timber'],
]

export const TrustBadges: React.FC = () => {
  return (
    <section className="border-b border-line bg-paper">
      <div className="editorial-container grid grid-cols-2 divide-x divide-y divide-line md:grid-cols-4 md:divide-y-0">
        {trustFacts.map(([value, label]) => (
          <div key={label} className="px-4 py-7 first:pl-0 md:py-9 md:first:pl-0">
            <p className="font-serif text-3xl font-bold tracking-[-0.04em] text-ink">{value}</p>
            <p className="mt-2 max-w-32 text-[11px] uppercase leading-4 tracking-[0.14em] text-muted-ink">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
