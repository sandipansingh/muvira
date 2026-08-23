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
    <nav
      className="stepper border-y border-[var(--color-line)] py-4"
      aria-label="Checkout progress"
    >
      {steps.map((step, index) => {
        const complete =
          (currentStep === 'shipping' && step.id === 'cart') ||
          (currentStep === 'payment' && step.id !== 'payment')
        const current = currentStep === step.id
        return (
          <React.Fragment key={step.id}>
            <div className="stepper__item" data-active={complete || current}>
              <span
                className={`stepper__marker text-xs font-bold ${
                  complete || current
                    ? ''
                    : 'border border-[var(--color-line)] bg-[var(--color-surface)]'
                }`}
              >
                {complete ? <Check className="h-4 w-4" /> : step.number}
              </span>
              <span className="truncate">{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className="hidden" aria-hidden="true" />}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default CheckoutSteps
