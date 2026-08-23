import React, { useState } from 'react'
import { Mail } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

interface NewsletterSectionProps {
  className?: string
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ className = '' }) => {
  const [email, setEmail] = useState('')
  const { showToast } = useToast()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      showToast('Please enter a valid email address.', 'error')
      return
    }
    showToast('Thank you for subscribing to our newsletter!', 'success')
    setEmail('')
  }

  return (
    <section className={`bg-[var(--color-surface)] py-12 sm:py-16 ${className}`}>
      <div className="editorial-container max-w-xl text-center">
        <h2 className="text-h2 text-ink">Join Our Newsletter</h2>
        <p className="mt-2 text-body-sm md:text-body text-muted">
          Sign up for deals, new products and promotions
        </p>

        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8">
          <div className="relative flex items-center border-b border-[var(--color-ink)]/30 pb-2">
            <Mail className="h-5 w-5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-transparent px-3 py-1 text-base text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none"
              aria-label="Email address for newsletter"
            />
            <button
              type="submit"
              className="shrink-0 font-medium text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default NewsletterSection
