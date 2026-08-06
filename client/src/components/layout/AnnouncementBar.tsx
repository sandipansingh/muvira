import React from 'react'

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#18181B] text-zinc-300 text-xs py-2 px-4 text-center font-medium tracking-wide">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="hidden sm:inline-block">
          Handcrafted in India • 15-Year Solid Wood Warranty
        </span>
        <span className="mx-auto sm:mx-0">
          Complimentary White-Glove Shipping on orders over ₹1,000 | Use Code:{' '}
          <strong className="text-[#C88D35] underline decoration-dashed">WELCOME10</strong>
        </span>
        <span className="hidden md:inline-block">Need help? Call +91 (800) 425-9876</span>
      </div>
    </div>
  )
}
