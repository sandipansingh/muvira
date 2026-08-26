import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ChevronRight } from 'lucide-react'

export interface FlowHeaderProps {
  currentStep: 'cart' | 'shipping' | 'payment'
  onBack?: () => void
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({ currentStep, onBack }) => {
  const navigate = useNavigate()

  const handleClose = () => {
    if (onBack) {
      onBack()
    } else if (currentStep === 'payment') {
      navigate('/checkout?step=shipping')
    } else if (currentStep === 'shipping') {
      navigate('/cart')
    } else {
      navigate('/shop')
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper)] py-3 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Back / Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Back / Close"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]"
        >
          <X className="h-4 w-4 stroke-[2]" />
        </button>

        {/* Step Breadcrumbs */}
        <nav
          aria-label="Checkout Progress"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <Link
            to="/cart"
            className={`font-medium transition-colors ${
              currentStep === 'cart'
                ? 'font-bold text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-primary)]'
            }`}
          >
            Shopping Cart
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />

          {currentStep === 'cart' ? (
            <span className="text-[var(--color-muted)]">Checkout</span>
          ) : (
            <>
              <Link
                to="/checkout?step=shipping"
                className={`font-medium transition-colors ${
                  currentStep === 'shipping'
                    ? 'font-bold text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-primary)]'
                }`}
              >
                Shipping
              </Link>

              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />

              <span
                className={`font-medium ${
                  currentStep === 'payment'
                    ? 'font-bold text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)]'
                }`}
              >
                Payment
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="hidden text-xs text-[var(--color-muted)] sm:block">
        Need help?{' '}
        <Link
          to="/shop"
          className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
        >
          Contact Support
        </Link>
      </div>
    </header>
  )
}

export default FlowHeader
