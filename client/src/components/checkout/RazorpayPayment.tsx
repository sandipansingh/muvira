import React, { useState } from 'react'
import { CreditCard, LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { orderApiService } from '../../lib/services/order.service'
import { INDIAN_STATES } from '../../lib/constants/states.constants'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { Dropdown } from '../ui/Dropdown'
import type { BillingAddressInput, CheckoutQuote, ShippingMethod } from '../../types/checkout'
import type { RazorpaySuccessResponse } from '../../types/razorpay'

interface RazorpayPaymentProps {
  addressId: string
  quote: CheckoutQuote
  couponCode?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingMethod: ShippingMethod
}

const EMPTY_BILLING_ADDRESS: BillingAddressInput = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: 'West Bengal',
  pincode: '',
  country: 'India',
  gstNumber: '',
}

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  addressId,
  quote,
  couponCode,
  customerName,
  customerEmail,
  customerPhone,
  shippingMethod,
}) => {
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [billing, setBilling] = useState<BillingAddressInput>(EMPTY_BILLING_ADDRESS)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resetAfterOrder } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const updateBilling = (field: keyof BillingAddressInput, value: string) => {
    setBilling((current) => ({ ...current, [field]: value }))
  }

  const verifyPayment = async (response: RazorpaySuccessResponse) => {
    try {
      const verification = await orderApiService.verifyPayment(
        response.razorpay_order_id,
        response.razorpay_payment_id,
        response.razorpay_signature
      )
      if (!verification.success || verification.data.paymentStatus !== 'paid') {
        throw new Error(
          verification.success ? 'Payment is not confirmed.' : verification.error.message
        )
      }

      resetAfterOrder()
      navigate(`/orders/success?orderId=${encodeURIComponent(verification.data.orderId)}`, {
        replace: true,
      })
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'Payment verification could not be completed.'
      navigate('/orders/failure', {
        state: { reason: message },
      })
    } finally {
      setProcessing(false)
    }
  }

  const startPayment = async () => {
    if (processing) return
    if (!window.Razorpay) {
      setError('Secure payment could not be loaded. Refresh the page and try again.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const created = await orderApiService.createOrder({
        addressId,
        couponCode,
        shippingMethod,
        billingSameAsShipping,
        ...(!billingSameAsShipping ? { billing } : {}),
      })
      if (!created.success) throw new Error(created.error.message)

      const checkout = new window.Razorpay({
        key: created.data.razorpayKeyId,
        amount: created.data.amountPaisa,
        currency: created.data.currency,
        name: import.meta.env.VITE_STORE_NAME || 'Muvira',
        description: `Order ${created.data.orderNumber}`,
        order_id: created.data.razorpayOrderId,
        handler: (response) => void verifyPayment(response),
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        retry: { enabled: true },
        modal: {
          ondismiss: () => {
            setProcessing(false)
            void orderApiService
              .cancelCheckout(created.data.orderId)
              .then(() =>
                showToast('Payment was not completed. Your reservation was released.', 'info')
              )
              .catch(() =>
                showToast(
                  'Payment status is still being confirmed. Check your orders before retrying.',
                  'info'
                )
              )
          },
        },
      })

      checkout.on('payment.failed', (response) => {
        setProcessing(false)
        setError(response.error?.description ?? 'Razorpay could not complete the payment.')
      })
      checkout.open()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to start payment.'
      setError(message)
      showToast(message, 'error')
      setProcessing(false)
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-xs sm:p-7">
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[var(--color-ink)]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">
            Secure payment
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-900">
          Payment details are entered only in Razorpay's secure checkout.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-line)] p-3 text-sm text-[var(--color-ink)]">
        <input
          type="checkbox"
          checked={billingSameAsShipping}
          onChange={(event) => setBillingSameAsShipping(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        Billing address is the same as shipping
      </label>

      {!billingSameAsShipping && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            value={billing.fullName}
            onChange={(event) => updateBilling('fullName', event.target.value)}
            placeholder="Billing name"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)]"
          />
          <input
            type="text"
            required
            value={billing.line1}
            onChange={(event) => updateBilling('line1', event.target.value)}
            placeholder="Billing address"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)]"
          />
          <input
            type="text"
            value={billing.line2}
            onChange={(event) => updateBilling('line2', event.target.value)}
            placeholder="Apartment or landmark (optional)"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)]"
          />
          <input
            type="text"
            required
            value={billing.city}
            onChange={(event) => updateBilling('city', event.target.value)}
            placeholder="City"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)]"
          />
          <Dropdown
            value={billing.state}
            onChange={(value) => updateBilling('state', value)}
            options={INDIAN_STATES}
            aria-label="Billing state"
            className="w-full"
            triggerClassName="min-h-11 !text-base"
            menuClassName="w-full"
          />
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            value={billing.pincode}
            onChange={(event) =>
              updateBilling('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="PIN code"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)]"
          />
          <input
            type="text"
            maxLength={15}
            value={billing.gstNumber}
            onChange={(event) =>
              updateBilling(
                'gstNumber',
                event.target.value
                  .toUpperCase()
                  .replace(/[^0-9A-Z]/g, '')
                  .slice(0, 15)
              )
            }
            placeholder="GSTIN (optional)"
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base uppercase text-[var(--color-ink)]"
          />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void startPayment()}
        disabled={processing || !addressId || quote.totalAmountPaisa < 100}
        className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {processing ? 'Verifying securely…' : 'Pay securely with Razorpay'}
      </button>
    </section>
  )
}
