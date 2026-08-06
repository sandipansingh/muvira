import React from 'react'
import { Check } from 'lucide-react'

interface CheckoutStepsProps {
  currentStep: 'cart' | 'shipping' | 'payment'
}

export const CheckoutSteps: React.FC<CheckoutStepsProps> = ({ currentStep }) => {
  const steps = [
    { id: 'cart', label: 'Cart', num: 1 },
    { id: 'shipping', label: 'Shipping', num: 2 },
    { id: 'payment', label: 'Payment', num: 3 },
  ]

  return (
    <div className="flex items-center justify-center gap-6 py-6 border-b border-zinc-200/80">
      {steps.map((step, idx) => {
        const isComplete =
          (currentStep === 'shipping' && step.id === 'cart') ||
          (currentStep === 'payment' && (step.id === 'cart' || step.id === 'shipping'))
        const isCurrent = currentStep === step.id

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete
                    ? 'bg-[#C88D35] text-white'
                    : isCurrent
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={`text-xs font-semibold ${isCurrent ? 'text-zinc-900' : 'text-zinc-500'}`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && <div className="w-12 h-0.5 bg-zinc-200" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
