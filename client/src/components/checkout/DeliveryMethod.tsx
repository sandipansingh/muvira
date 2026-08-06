import React from 'react'

interface DeliveryMethodProps {
  method: 'white_glove' | 'standard'
  setMethod: (m: 'white_glove' | 'standard') => void
  isFreeShipping: boolean
}

export const DeliveryMethod: React.FC<DeliveryMethodProps> = ({
  method,
  setMethod,
  isFreeShipping,
}) => {
  return (
    <div className="bg-[#F6F4EF] p-6 rounded-2xl border border-zinc-200/80 space-y-4">
      <h4 className="font-serif text-lg font-bold text-zinc-900">Delivery Method</h4>

      <div className="space-y-3">
        <label
          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
            method === 'white_glove'
              ? 'bg-white border-[#C88D35] shadow-xs ring-1 ring-[#C88D35]/20'
              : 'bg-white/60 border-zinc-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="deliveryMethod"
              checked={method === 'white_glove'}
              onChange={() => setMethod('white_glove')}
              className="accent-[#C88D35]"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900">White-Glove Delivery & Setup</p>
              <p className="text-[11px] text-zinc-500">
                Arrives in 5–7 business days • Uncrated & positioned in room of choice
              </p>
            </div>
          </div>
          <span className="font-bold text-xs text-zinc-900">
            {isFreeShipping ? 'Free' : '₹150'}
          </span>
        </label>

        <label
          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
            method === 'standard'
              ? 'bg-white border-[#C88D35] shadow-xs ring-1 ring-[#C88D35]/20'
              : 'bg-white/60 border-zinc-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="deliveryMethod"
              checked={method === 'standard'}
              onChange={() => setMethod('standard')}
              className="accent-[#C88D35]"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900">Standard Express Delivery</p>
              <p className="text-[11px] text-zinc-500">Arrives in 3–5 business days</p>
            </div>
          </div>
          <span className="font-bold text-xs text-zinc-900">
            {isFreeShipping ? 'Free' : '₹150'}
          </span>
        </label>
      </div>
    </div>
  )
}
