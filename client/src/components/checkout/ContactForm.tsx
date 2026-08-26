import React from 'react'

interface ContactFormProps {
  email: string
  setEmail: (value: string) => void
}

export const ContactForm: React.FC<ContactFormProps> = ({ email, setEmail }) => (
  <section className="border-b border-[var(--color-line)] pb-6">
    <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Contact Information</h2>
    <div className="mt-4">
      <label
        htmlFor="checkout-email"
        className="mb-1.5 block text-xs font-normal text-[var(--color-ink)]"
      >
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
        className="input"
      />
    </div>
  </section>
)

export default ContactForm
