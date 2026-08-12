import React from 'react'
import { Check } from 'lucide-react'

interface CheckoutStepsProps {
  currentStep: 'cart' | 'shipping' | 'payment'
}

export const CheckoutSteps: React.FC<CheckoutStepsProps> = ({ currentStep }) => {
  const steps = [
    { id: 'cart', label: 'Cart', number: 1 },
    { id: 'shipping', label: 'Shipping', number: 2 },
    { id: 'payment', label: 'Payment', number: 3 },
  ]
  return (
    <nav className="flex items-center border-y border-line py-4" aria-label="Checkout progress">
      {steps.map((step, index) => {
        const complete =
          (currentStep === 'shipping' && step.id === 'cart') ||
          (currentStep === 'payment' && step.id !== 'payment')
        const current = currentStep === step.id
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center border text-xs font-semibold ${complete || current ? 'border-ink bg-ink text-paper' : 'border-line text-muted-ink'}`}
              >
                {complete ? <Check className="h-4 w-4" /> : step.number}
              </span>
              <span className={`text-xs font-semibold ${current ? 'text-ink' : 'text-muted-ink'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className="mx-4 h-px flex-1 bg-line" />}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
