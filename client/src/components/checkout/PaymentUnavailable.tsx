import React from 'react'
import { ShieldAlert } from 'lucide-react'

type PaymentUnavailableProps = {
  onBack: () => void
}

export const PaymentUnavailable: React.FC<PaymentUnavailableProps> = ({ onBack }) => (
  <section className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-xs sm:p-8">
    <ShieldAlert className="h-8 w-8 text-[var(--color-ink)]" aria-hidden="true" />
    <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">
      Online payment is temporarily unavailable
    </h2>
    <p className="mt-3 leading-relaxed text-neutral-900">
      We are updating our secure payment connection. Your order has not been placed and no payment
      details have been collected.
    </p>
    <button
      type="button"
      onClick={onBack}
      className="mt-6 min-h-11 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 font-bold text-white hover:bg-[var(--color-primary-hover)]"
    >
      Return to shipping
    </button>
  </section>
)
