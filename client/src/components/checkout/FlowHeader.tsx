import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CheckoutSteps } from './CheckoutSteps'

export interface FlowHeaderProps {
  currentStep: 'cart' | 'shipping' | 'payment'
  onBack?: () => void
  compact?: boolean
}

export function FlowHeader({ currentStep, onBack, compact = false }: FlowHeaderProps) {
  const navigate = useNavigate()
  const titles = { cart: 'Your shopping bag', shipping: 'Shipping details', payment: 'Payment' }
  const handleBack = () => {
    if (onBack) onBack()
    else
      navigate(
        currentStep === 'payment'
          ? '/checkout?step=shipping'
          : currentStep === 'shipping'
            ? '/cart'
            : '/shop'
      )
  }
  return (
    <header className="checkout-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="checkout-heading__title">
          {currentStep !== 'cart' && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back / Close"
              className="button-secondary shrink-0 p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="page-title">{titles[currentStep]}</h1>
        </div>
        {!compact && (
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center text-sm text-muted hover:text-primary"
          >
            Continue shopping
          </Link>
        )}
      </div>
      <CheckoutSteps currentStep={currentStep} />
    </header>
  )
}
export default FlowHeader
