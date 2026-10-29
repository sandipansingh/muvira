import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { Breadcrumbs } from '../common/Breadcrumbs'
import { CheckoutSteps } from './CheckoutSteps'

export interface FlowHeaderProps {
  currentStep: 'cart' | 'shipping' | 'payment'
  onBack?: () => void
  compact?: boolean
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({ currentStep, onBack, compact = false }) => {
  const navigate = useNavigate()
  const titles = {
    cart: 'Your shopping bag',
    shipping: 'Shipping details',
    payment: 'Payment',
  }
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
    <header className={`checkout-heading ${compact ? 'checkout-heading--compact' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shopping bag', href: currentStep === 'cart' ? undefined : '/cart' },
            ...(currentStep !== 'cart' ? [{ label: 'Checkout' }] : []),
          ]}
        />
        {!compact && (
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-primary"
          >
            Continue shopping
          </Link>
        )}
      </div>
      <div className="mb-8 mt-5 flex items-start gap-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back / Close"
          className="button-secondary shrink-0 p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="page-title">{titles[currentStep]}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <LockKeyhole className="h-4 w-4" />
            {currentStep === 'cart'
              ? 'A few meaningful things, all in one place.'
              : 'Review your details before paying securely with Razorpay.'}
          </p>
        </div>
      </div>
      <CheckoutSteps currentStep={currentStep} />
    </header>
  )
}
export default FlowHeader
