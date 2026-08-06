import React, { useState } from 'react'
import { useToast } from '../../context/ToastContext'

export const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('')
  const { showToast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      showToast('Thank you for subscribing! Check your inbox for 10% off.', 'success')
      setEmail('')
    }
  }

  return (
    <section className="bg-[#121214] text-white py-16 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#C88D35]">
          Exclusive Access
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
          Stay in the loop
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto font-light">
          New arrivals, secret sample sales, and stories from the workshop—once a month, never more.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#242428] border border-zinc-700 text-white placeholder-zinc-500 px-5 py-3 rounded-full text-base focus:outline-none focus:border-[#C88D35]"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-white text-zinc-900 hover:bg-[#C88D35] hover:text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-colors shrink-0 shadow-md"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  )
}
