import React from 'react'

interface ContactFormProps {
  email: string
  setEmail: (value: string) => void
}

export const ContactForm: React.FC<ContactFormProps> = ({ email, setEmail }) => (
  <section className="border-b border-border-light pb-6">
    <h2 className="font-display text-xl font-bold text-foreground">Contact Information</h2>
    <div className="mt-4">
      <label htmlFor="checkout-email" className="mb-1.5 block text-xs font-bold text-foreground">
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

export default ContactForm
