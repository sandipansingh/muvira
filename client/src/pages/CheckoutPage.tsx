import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { addressService } from '../lib/services/address.service'
import { checkoutService } from '../lib/services/checkout.service'
import { useCheckoutSession } from '../lib/hooks/useCheckoutSession'
import { validateCheckoutAddress } from '../lib/validators/checkout.validator'
import { FlowHeader } from '../components/checkout/FlowHeader'
import { ShippingSection, type ShippingFormData } from '../components/checkout/ShippingSection'
import {
  BillingDetails,
  EMPTY_BILLING_ADDRESS,
  billingErrors,
} from '../components/checkout/BillingDetails'
import { CheckoutSummary } from '../components/checkout/CheckoutSummary'
import { RazorpayPayment } from '../components/checkout/RazorpayPayment'
import { Button } from '../components/ui/Button'
import type { AddressData } from '../components/checkout/AddressSelector'
import type { Address } from '../lib/types/cart'
import type { BillingAddressInput, CheckoutQuote, ShippingMethod } from '../types/checkout'

function toAddressData(address: Address): AddressData {
  return {
    id: address.id,
    fullName: address.fullName,
    label: address.label,
    streetAddress: address.line1,
    apartment: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    phone: address.phone,
    isDefault: address.isDefault,
  }
}

export function CheckoutPage() {
  const [params, setParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const {
    items,
    coupon,
    hasUnmergedItems,
    status: cartStatus,
    error: cartError,
    retry: retryCart,
    resetAfterOrder,
  } = useCart()
  const payment = useCheckoutSession(user?.id)
  const { session } = payment
  const step = session ? 'payment' : params.get('step') === 'payment' ? 'payment' : 'shipping'
  const navigate = useNavigate()
  const completed = useRef<string | null>(null)
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [addressId, setAddressId] = useState('')
  const [addressLoading, setAddressLoading] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressAttempt, setAddressAttempt] = useState(0)
  const [shipping, setShipping] = useState<ShippingFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: 'West Bengal',
    pincode: '',
    description: '',
  })
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')
  const [sameBilling, setSameBilling] = useState(true)
  const [billing, setBilling] = useState<BillingAddressInput>(EMPTY_BILLING_ADDRESS)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [billingFieldErrors, setBillingFieldErrors] = useState<Record<string, string>>({})
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteAttempt, setQuoteAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const [firstName = '', ...rest] = (user.fullName || '').split(' ')
    setShipping((current) => ({
      ...current,
      firstName: current.firstName || firstName,
      lastName: current.lastName || rest.join(' '),
      email: user.email || '',
      phone: current.phone || user.phone || '',
    }))
  }, [user])
  useEffect(() => {
    if (!user) return
    let active = true
    setAddressLoading(true)
    setAddressError(null)
    addressService
      .getAddresses()
      .then((result) => {
        if (!active) return
        if (!result.success) throw new Error(result.error.message)
        const next = result.data.map(toAddressData)
        setAddresses(next)
        setAddressId(
          (current) => current || next.find((address) => address.isDefault)?.id || next[0]?.id || ''
        )
      })
      .catch((reason: unknown) => {
        if (active)
          setAddressError(
            reason instanceof Error ? reason.message : 'Unable to load your delivery addresses.'
          )
      })
      .finally(() => {
        if (active) setAddressLoading(false)
      })
    return () => {
      active = false
    }
  }, [user, addressAttempt])
  useEffect(() => {
    if (!user || !items.length || hasUnmergedItems || session) {
      setQuoteLoading(false)
      return
    }
    let active = true
    setQuoteLoading(true)
    setQuoteError(null)
    checkoutService
      .quote(shippingMethod, coupon?.code)
      .then((result) => {
        if (active) setQuote(result)
      })
      .catch((reason: unknown) => {
        if (active) {
          setQuote(null)
          setQuoteError(
            reason instanceof Error ? reason.message : 'Unable to calculate your total.'
          )
        }
      })
      .finally(() => {
        if (active) setQuoteLoading(false)
      })
    return () => {
      active = false
    }
  }, [user, items, hasUnmergedItems, session, shippingMethod, coupon?.code, quoteAttempt])
  useEffect(() => {
    if (!payment.loading && !payment.error && !session && cartStatus === 'ready' && !items.length)
      navigate('/cart', { replace: true })
  }, [payment.loading, payment.error, session, cartStatus, items.length, navigate])
  useEffect(() => {
    if (session?.state === 'paid' && completed.current !== session.orderId) {
      completed.current = session.orderId
      resetAfterOrder()
      navigate(`/orders/success?orderId=${encodeURIComponent(session.orderId)}`, { replace: true })
    }
  }, [session, resetAfterOrder, navigate])

  const canReview =
    !!quote &&
    !quoteLoading &&
    !quoteError &&
    !hasUnmergedItems &&
    !payment.loading &&
    !payment.error &&
    !addressLoading &&
    !addressError &&
    !!addressId
  const validateDelivery = () => {
    if (sameBilling) setBillingFieldErrors({})
    else {
      const errors = billingErrors(billing)
      setBillingFieldErrors(errors)
      const first = Object.keys(errors)[0]
      if (first) {
        document.getElementById(`billing-${first}`)?.focus()
        return false
      }
    }
    if (addressId) return true
    const result = validateCheckoutAddress({
      fullName: `${shipping.firstName} ${shipping.lastName}`.trim(),
      phone: shipping.phone,
      line1: shipping.description,
      city: shipping.city,
      state: shipping.state,
      pincode: shipping.pincode,
    })
    const names: Record<string, string> = { fullName: 'firstName', line1: 'description' }
    const errors = Object.fromEntries(
      Object.entries(result.errors).map(([key, value]) => [names[key] || key, value])
    )
    setFieldErrors(errors)
    const first = Object.keys(errors)[0]
    if (first) document.getElementById(`shipping-${first}`)?.focus()
    return result.isValid
  }

  const continueToPayment = async () => {
    if (
      saving ||
      !quote ||
      quoteLoading ||
      quoteError ||
      payment.error ||
      hasUnmergedItems ||
      !validateDelivery()
    )
      return
    setSaving(true)
    setDeliveryError(null)
    try {
      if (!addressId) {
        const created = await addressService.createAddress({
          fullName: `${shipping.firstName} ${shipping.lastName}`.trim(),
          phone: shipping.phone,
          line1: shipping.description,
          line2: null,
          city: shipping.city,
          state: shipping.state,
          pincode: shipping.pincode,
          country: 'India',
          label: 'Delivery address',
          isDefault: !addresses.length,
        })
        if (!created.success) throw new Error(created.error.message)
        setAddresses((current) => [...current, toAddressData(created.data)])
        setAddressId(created.data.id)
      }
      setParams({ step: 'payment' })
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch (reason) {
      setDeliveryError(
        reason instanceof Error ? reason.message : 'Unable to save delivery details.'
      )
    } finally {
      setSaving(false)
    }
  }

  const prepare = async () => {
    if (!canReview || !validateDelivery())
      throw new Error('Review delivery details and your total before continuing.')
    await payment.prepare({
      addressId,
      shippingMethod,
      couponCode: coupon?.code,
      billingSameAsShipping: sameBilling,
      ...(!sameBilling ? { billing } : {}),
    })
  }

  const selected = addresses.find((address) => address.id === addressId)
  const shippingSnapshot = session?.snapshot.shipping
  const restart = () => {
    payment.clearReleased()
    setParams({ step: 'shipping' })
    setQuoteAttempt((value) => value + 1)
  }

  if (authLoading || (payment.loading && !session))
    return (
      <main className="editorial-page py-16">
        <div className="editorial-container" role="status">
          Preparing your checkout…
        </div>
      </main>
    )
  if (cartStatus !== 'ready' && !session)
    return (
      <main className="editorial-page py-16">
        <div className="editorial-container" role="status">
          <p>{cartStatus === 'error' ? cartError : 'Loading your bag…'}</p>
          {cartStatus === 'error' && (
            <Button onClick={retryCart} className="mt-4">
              Retry loading cart
            </Button>
          )}
        </div>
      </main>
    )

  return (
    <main className="checkout-page journey-checkout checkout-custom bg-background pb-28 lg:pb-20">
      <div className="layout-container">
        <FlowHeader
          compact
          currentStep={step}
          onBack={() => {
            if (session) navigate('/orders')
            else if (step === 'payment') setParams({ step: 'shipping' })
            else navigate('/cart')
          }}
        />
        {(payment.error || quoteError || hasUnmergedItems) && (
          <div className="checkout-notice mb-6" role="alert">
            <p>
              {payment.error ||
                quoteError ||
                'Some bag items need attention. Return to your bag before continuing.'}
            </p>
            {payment.error ? (
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  void payment.refresh()
                }}
              >
                Check current payment
              </Button>
            ) : quoteError ? (
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => setQuoteAttempt((value) => value + 1)}
              >
                Retry calculating total
              </Button>
            ) : (
              <Link to="/cart" className="mt-3 inline-flex min-h-11 items-center text-primary">
                Return to bag
              </Link>
            )}
          </div>
        )}
        <div className="checkout-workspace">
          <div className="min-w-0 space-y-6">
            {step === 'shipping' ? (
              <>
                {addressLoading ? (
                  <div className="checkout-section" role="status">
                    Loading delivery addresses…
                  </div>
                ) : addressError ? (
                  <div className="checkout-notice" role="alert">
                    {addressError}
                    <Button
                      variant="secondary"
                      className="mt-3"
                      onClick={() => setAddressAttempt((value) => value + 1)}
                    >
                      Retry addresses
                    </Button>
                  </div>
                ) : (
                  <ShippingSection
                    shippingData={shipping}
                    onShippingDataChange={setShipping}
                    shippingMethod={shippingMethod}
                    onShippingMethodChange={setShippingMethod}
                    shippingOptions={quote?.shippingMethods}
                    savedAddresses={addresses}
                    selectedAddressId={addressId}
                    onSelectSavedAddress={setAddressId}
                    errors={fieldErrors}
                  />
                )}
                <BillingDetails
                  sameAsShipping={sameBilling}
                  onSameChange={setSameBilling}
                  value={billing}
                  onChange={setBilling}
                  errors={billingFieldErrors}
                />
                {deliveryError && (
                  <p role="alert" className="checkout-notice">
                    {deliveryError}
                  </p>
                )}
              </>
            ) : (
              <>
                <section className="checkout-delivery-recap" aria-label="Delivery details">
                  <MapPin className="mt-1 h-5 w-5 text-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <span className="checkout-eyebrow">Delivering to</span>
                    <p className="text-sm font-semibold">
                      {shippingSnapshot?.fullName ??
                        selected?.fullName ??
                        'Choose a delivery address'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {shippingSnapshot
                        ? `${shippingSnapshot.line1}, ${shippingSnapshot.city} ${shippingSnapshot.pincode}`
                        : selected
                          ? `${selected.streetAddress}, ${selected.city} ${selected.pincode}`
                          : 'Return to delivery to complete your details.'}
                    </p>
                  </div>
                  {!session ? (
                    <Button variant="ghost" onClick={() => setParams({ step: 'shipping' })}>
                      Edit
                    </Button>
                  ) : (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </section>
                <RazorpayPayment
                  session={session}
                  onSession={payment.setSession}
                  onPrepare={prepare}
                  canReview={canReview}
                  setupError={payment.error}
                  onRestart={restart}
                  previewTotalPaisa={quote?.totalAmountPaisa}
                />
                {session && (
                  <p className="px-2 text-xs leading-relaxed text-muted">
                    Your delivery details and total are fixed for this payment. If you need changes,
                    request cancellation and wait for confirmation before starting again.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="min-w-0">
            <CheckoutSummary
              items={items}
              quote={quote}
              session={session}
              loading={quoteLoading}
              action={
                step === 'shipping' ? (
                  <Button
                    size="xl"
                    onClick={() => {
                      void continueToPayment()
                    }}
                    isLoading={saving}
                    disabled={
                      !quote ||
                      quoteLoading ||
                      !!quoteError ||
                      !!payment.error ||
                      addressLoading ||
                      !!addressError ||
                      hasUnmergedItems
                    }
                    className="w-full"
                  >
                    Continue to payment
                  </Button>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default CheckoutPage
