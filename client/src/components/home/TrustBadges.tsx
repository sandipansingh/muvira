import React from 'react'
import { Award, ShieldCheck, Sparkles, Truck } from 'lucide-react'

const trustFacts = [
  { icon: Truck, value: '2.4k+', label: 'Happy homes furnished' },
  { icon: Sparkles, value: '340+', label: 'Handcrafted designs' },
  { icon: ShieldCheck, value: '15yr', label: 'Solid wood warranty' },
  { icon: Award, value: '100%', label: 'Responsibly sourced timber' },
]

export const TrustBadges: React.FC = () => {
  return (
    <section className="bg-white py-6">
      <div className="editorial-container">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {trustFacts.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-800 shadow-xs border border-slate-100">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-2xl font-extrabold tracking-tight text-slate-900">
                  {value}
                </p>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
