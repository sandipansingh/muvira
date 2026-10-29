import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAuthDialog } from '../context/AuthDialogContext'
import { useCart } from '../context/CartContext'
import { addressService } from '../lib/services/address.service'
import { checkoutService } from '../lib/services/checkout.service'
import { useCheckoutSession } from '../lib/hooks/useCheckoutSession'
import { validateCheckoutAddress } from '../lib/validators/checkout.validator'
import { ShippingSection, type ShippingFormData } from '../components/checkout/ShippingSection'
import {
  BillingDetails,
  EMPTY_BILLING_ADDRESS,
  billingErrors,
} from '../components/checkout/BillingDetails'
import { CheckoutBag, CheckoutTotals } from '../components/checkout/CheckoutSummary'
import { CouponInput } from '../components/cart/CouponInput'
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

function AccountCard() {
  const { user } = useAuth()
  const { openAuth } = useAuthDialog()
  return (
    <section className="checkout-section checkout-account" aria-labelledby="account-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="account-heading" className="journey-section-title">
          {user ? 'Your account' : 'Sign in to checkout'}
        </h2>
        {user ? (
          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Button
            variant="secondary"
            data-auth-focus="account"
            onClick={(event) => openAuth({ mode: 'signin', trigger: event.currentTarget })}
          >
            Sign in
          </Button>
        )}
      </div>
      <p className="mt-2 break-words text-sm text-muted">
        {user
          ? user.email
          : 'View and edit your bag here. Sign in to arrange delivery and payment.'}
      </p>
    </section>
  )
}

function CheckoutLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <main className="checkout-page checkout-custom unified-checkout">
      <h1 className="checkout-page-title">Checkout</h1>
      <div className="checkout-workspace">
        <div className="checkout-left">{left}</div>
        <div className="checkout-right">{right}</div>
      </div>
    </main>
  )
}

function SignedOutCheckout() {
  return (
    <CheckoutLayout
      left={
        <>
          <AccountCard />
          <section className="checkout-section checkout-shipping">
            <h2 className="journey-section-title">Shipping information</h2>
            <p className="mt-3 text-sm text-muted">Sign in to choose or save a delivery address.</p>
          </section>
          <section className="checkout-section checkout-payment">
            <h2 className="journey-section-title">Payment method</h2>
            <p className="mt-3 text-sm text-muted">
              Secure payment options are available after sign in.
            </p>
          </section>
        </>
      }
      right={
        <>
          <CheckoutBag quote={null} session={null} disabled={false} authenticated={false} />
          <CheckoutTotals quote={null} session={null} loading={false}>
            <section className="checkout-section checkout-promo">
              <h2 className="journey-section-title">Promo code</h2>
              <p className="mt-3 text-sm text-muted">Sign in to apply a promo code.</p>
            </section>
            <Button disabled className="checkout-review-button w-full">
              Review payment
            </Button>
          </CheckoutTotals>
        </>
      }
    />
  )
}

function AuthenticatedCheckout({ accountId }: { accountId: string }) {
  const { user } = useAuth()
  const cart = useCart()
  const {
    items,
    coupon,
    hasUnmergedItems,
    status: cartStatus,
    loading: cartBusy,
    resetAfterOrder,
  } = cart
  const payment = useCheckoutSession(accountId)
  const { session, previousSession } = payment
  const navigate = useNavigate()
  const mounted = useRef(true)
  const completed = useRef<string | null>(null)
  const preparing = useRef(false)
  const [preparingPayment, setPreparingPayment] = useState(false)
  const [footerOutlet, setFooterOutlet] = useState<HTMLDivElement | null>(null)
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [addressId, setAddressId] = useState('')
  const [addressLoading, setAddressLoading] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressAttempt, setAddressAttempt] = useState(0)
  const [shipping, setShipping] = useState<ShippingFormData>(() => {
    const [firstName = '', ...rest] = (user?.fullName || '').split(' ')
    return {
      firstName,
      lastName: rest.join(' '),
      email: user?.email || '',
      phone: user?.phone || '',
      city: '',
      state: 'West Bengal',
      pincode: '',
      description: '',
    }
  })
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')
  const [sameBilling, setSameBilling] = useState(true)
  const [billing, setBilling] = useState<BillingAddressInput>(EMPTY_BILLING_ADDRESS)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [billingFieldErrors, setBillingFieldErrors] = useState<Record<string, string>>({})
  const [quoteResult, setQuoteResult] = useState<{ key: string; value: CheckoutQuote } | null>(null)
  const [quotePending, setQuotePending] = useState(true)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteAttempt, setQuoteAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const quoteKey = JSON.stringify([items, coupon?.code, shippingMethod, addressId, quoteAttempt])
  const quote = quoteResult?.key === quoteKey && !cartBusy ? quoteResult.value : null
  const quoteLoading = !session && (quotePending || (!!items.length && !quote && !quoteError))
  const locked =
    !!session || preparingPayment || (!!payment.error && !previousSession) || payment.loading
  const editsDisabled = locked || cartBusy || cartStatus !== 'ready' || saving

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    let active = true
    setAddressLoading(true)
    setAddressError(null)
    addressService
      .getAddresses(accountId)
      .then((result) => {
        if (!active) return
        if (!result.success) throw new Error(result.error.message)
        const next = result.data.map(toAddressData)
        setAddresses(next)
        setAddressId((current) =>
          next.some((address) => address.id === current)
            ? current
            : next.find((address) => address.isDefault)?.id || next[0]?.id || ''
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
  }, [accountId, addressAttempt])
  useEffect(() => {
    setQuoteError(null)
    if (
      !items.length ||
      hasUnmergedItems ||
      session ||
      cartBusy ||
      cartStatus !== 'ready' ||
      addressLoading ||
      saving
    ) {
      setQuotePending(false)
      return
    }
    let active = true
    setQuotePending(true)
    checkoutService
      .quote(shippingMethod, coupon?.code, addressId || undefined, accountId)
      .then((result) => {
        if (active) setQuoteResult({ key: quoteKey, value: result })
      })
      .catch((reason: unknown) => {
        if (active) {
          setQuoteResult(null)
          setQuoteError(
            reason instanceof Error ? reason.message : 'Unable to calculate your total.'
          )
        }
      })
      .finally(() => {
        if (active) setQuotePending(false)
      })
    return () => {
      active = false
    }
  }, [
    accountId,
    quoteKey,
    items.length,
    hasUnmergedItems,
    session,
    cartBusy,
    cartStatus,
    addressLoading,
    saving,
    shippingMethod,
    coupon?.code,
    addressId,
  ])
  useEffect(() => {
    if (session?.state === 'paid' && completed.current !== session.orderId) {
      completed.current = session.orderId
      resetAfterOrder()
      navigate(`/orders/success?orderId=${encodeURIComponent(session.orderId)}`, { replace: true })
    }
  }, [session, resetAfterOrder, navigate])

  const canReview =
    !payment.error &&
    !!quote &&
    quote.deliveryAvailable === true &&
    !quote.isPreview &&
    !quoteLoading &&
    !quoteError &&
    !hasUnmergedItems &&
    !locked &&
    !cartBusy &&
    cartStatus === 'ready' &&
    !addressLoading &&
    !addressError &&
    !!addressId &&
    !saving &&
    items.length > 0 &&
    items.every((item) => item.inStock && item.quantity <= item.availableStock)
  const saveAddress = async () => {
    if (savingRef.current || preparing.current || locked || cartBusy) return
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
    if (first) {
      document.getElementById(`shipping-${first}`)?.focus()
      return
    }
    savingRef.current = true
    setSaving(true)
    setDeliveryError(null)
    try {
      const created = await addressService.createAddress(
        {
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
        },
        accountId
      )
      if (!mounted.current) return
      if (!created.success) throw new Error(created.error.message)
      setAddresses((current) => [
        ...current.map((address) =>
          created.data.isDefault ? { ...address, isDefault: false } : address
        ),
        toAddressData(created.data),
      ])
      setAddressId(created.data.id)
      setQuoteAttempt((value) => value + 1)
    } catch (reason) {
      if (mounted.current)
        setDeliveryError(
          reason instanceof Error
            ? reason.message
            : 'Unable to save your address. Try saving again.'
        )
    } finally {
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }
  const prepare = async () => {
    if (!canReview || preparing.current || savingRef.current)
      throw new Error('Review delivery details and your total before continuing.')
    const errors = sameBilling ? {} : billingErrors(billing)
    setBillingFieldErrors(errors)
    const first = Object.keys(errors)[0]
    if (first) {
      document.getElementById(`billing-${first}`)?.focus()
      throw new Error('Complete your billing details.')
    }
    preparing.current = true
    setPreparingPayment(true)
    try {
      await payment.prepare({
        addressId,
        shippingMethod,
        couponCode: coupon?.code,
        billingSameAsShipping: sameBilling,
        ...(!sameBilling ? { billing } : {}),
      })
    } finally {
      preparing.current = false
      if (mounted.current) setPreparingPayment(false)
    }
  }
  const restart = () => {
    if (session?.state !== 'released') return
    payment.clearReleased()
    setQuoteAttempt((value) => value + 1)
  }
  return (
    <CheckoutLayout
      left={
        <>
          <AccountCard />
          <section
            className="checkout-section checkout-shipping"
            aria-labelledby="shipping-info-heading"
          >
            <h2 id="shipping-info-heading" className="journey-section-title">
              Shipping information
            </h2>
            {session ? (
              <div className="mt-4 flex gap-3 text-sm">
                <MapPin className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{session.snapshot.shipping.fullName}</p>
                  <p className="mt-1 text-muted">
                    {[
                      session.snapshot.shipping.line1,
                      session.snapshot.shipping.line2,
                      session.snapshot.shipping.city,
                      session.snapshot.shipping.state,
                      session.snapshot.shipping.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="mt-1 text-muted">{session.snapshot.shipping.phone}</p>
                  <p className="mt-3 text-xs text-muted">
                    Delivery details are fixed for this payment.
                  </p>
                </div>
              </div>
            ) : addressLoading ? (
              <p className="mt-4 text-sm text-muted" role="status">
                Loading delivery addresses…
              </p>
            ) : addressError ? (
              <div role="alert" className="mt-4 text-sm text-danger">
                <p>{addressError}</p>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setAddressAttempt((value) => value + 1)}
                >
                  Retry addresses
                </Button>
              </div>
            ) : (
              <fieldset disabled={editsDisabled} className="min-w-0">
                <legend className="sr-only">Delivery and billing details</legend>
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveAddress()
                  }}
                >
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
                    saving={saving}
                  />
                </form>
                {deliveryError && (
                  <p role="alert" className="mb-4 text-sm text-danger">
                    {deliveryError} Try Save address again.
                  </p>
                )}
                <BillingDetails
                  sameAsShipping={sameBilling}
                  onSameChange={setSameBilling}
                  value={billing}
                  onChange={setBilling}
                  errors={billingFieldErrors}
                />
              </fieldset>
            )}
            {!session && quote?.deliveryAvailable === false && (
              <p className="mt-4 text-sm text-danger" role="alert">
                This delivery method is unavailable for your address. Choose another method or
                address.
              </p>
            )}
          </section>
          <RazorpayPayment
            accountId={accountId}
            session={session}
            onSession={payment.setSession}
            onPrepare={prepare}
            canReview={canReview}
            setupError={payment.error}
            onRestart={restart}
            previewTotalPaisa={quote?.totalAmountPaisa}
            actionOutlet={footerOutlet}
          />
        </>
      }
      right={
        <>
          <CheckoutBag quote={quote} session={session} disabled={editsDisabled} authenticated />
          <CheckoutTotals
            quote={quote}
            session={session}
            loading={quoteLoading}
            error={session ? null : quoteError}
            onRetry={() => setQuoteAttempt((value) => value + 1)}
          >
            <section className="checkout-section checkout-promo" aria-labelledby="promo-heading">
              <h2 id="promo-heading" className="journey-section-title mb-4">
                Promo code
              </h2>
              {session ? (
                <p className="text-sm text-muted">
                  {session.snapshot.couponCode
                    ? `${session.snapshot.couponCode} applied`
                    : 'No promo code on this order.'}
                </p>
              ) : (
                <fieldset
                  className="min-w-0"
                  disabled={editsDisabled || hasUnmergedItems || !items.length}
                >
                  <legend className="sr-only">Apply a promo code</legend>
                  <CouponInput disabled={editsDisabled || hasUnmergedItems || !items.length} />
                </fieldset>
              )}
            </section>
            {payment.loading && (
              <p role="status" className="text-sm text-muted">
                Checking your current payment…
              </p>
            )}
            {payment.error && (
              <Button variant="secondary" onClick={() => void payment.refresh()}>
                Check current payment
              </Button>
            )}
            <div ref={setFooterOutlet} className="checkout-payment-outlet" />
          </CheckoutTotals>
        </>
      }
    />
  )
}

export function CheckoutPage() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <main className="unified-checkout p-6" role="status">
        Loading your checkout…
      </main>
    )
  return user ? <AuthenticatedCheckout key={user.id} accountId={user.id} /> : <SignedOutCheckout />
}
export default CheckoutPage
