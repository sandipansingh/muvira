import React from 'react'

interface ContactFormProps {
  email: string
  setEmail: (value: string) => void
}

export const ContactForm: React.FC<ContactFormProps> = ({ email, setEmail }) => (
  <section className="border-b border-line pb-6">
    <h2 className="font-serif text-2xl font-bold text-ink">Contact information</h2>
    <div className="mt-4">
      <label htmlFor="checkout-email" className="mb-2 block text-xs font-semibold text-ink">
        Email address
      </label>
      <input
        id="checkout-email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="editorial-input"
      />
    </div>
  </section>
)
