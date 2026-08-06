import React from 'react'

interface ContactFormProps {
  email: string
  setEmail: (val: string) => void
  subscribeToUpdates: boolean
  setSubscribeToUpdates: (val: boolean) => void
}

export const ContactForm: React.FC<ContactFormProps> = ({
  email,
  setEmail,
  subscribeToUpdates,
  setSubscribeToUpdates,
}) => {
  return (
    <div className="bg-[#F6F4EF] p-6 rounded-2xl border border-zinc-200/80 space-y-4">
      <h4 className="font-serif text-lg font-bold text-zinc-900">Contact Information</h4>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="priya.nair@email.com"
          className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C88D35]"
        />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={subscribeToUpdates}
          onChange={(e) => setSubscribeToUpdates(e.target.checked)}
          className="w-4 h-4 accent-[#C88D35] rounded-xs"
        />
        <span>Email me with order updates and shipping notifications</span>
      </label>
    </div>
  )
}
