import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Address } from '../lib/types/cart'
import { addressService } from '../lib/services/address.service'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { FlowHeader } from '../components/checkout/FlowHeader'
import { FlowItemCard } from '../components/checkout/FlowItemCard'
import { FlowCartSidebar } from '../components/checkout/FlowCartSidebar'
import { ShippingSection, type ShippingFormData } from '../components/checkout/ShippingSection'
import { PaymentUnavailable } from '../components/checkout/PaymentUnavailable'
import { RecommendedUpsell } from '../components/checkout/RecommendedUpsell'
import type { AddressData } from '../components/checkout/AddressSelector'
import { formatPrice } from '../lib/utils/format'
import { checkoutService } from '../lib/services/checkout.service'
import type { CheckoutQuote, ShippingMethod } from '../types/checkout'
import { Tag, CheckCircle, X, HelpCircle } from 'lucide-react'

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

export const CheckoutPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const stepParam = searchParams.get('step')
  const currentStep: 'shipping' | 'payment' = stepParam === 'payment' ? 'payment' : 'shipping'

  const { user, loading: authLoading } = useAuth()
  const { items, itemCount, coupon, applyCoupon, removeCoupon, hasUnmergedItems } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Addresses
  const [savedAddresses, setSavedAddresses] = useState<AddressData[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')

  // Shipping Form State
  const [shippingData, setShippingData] = useState<ShippingFormData>({
    firstName: user?.fullName ? user.fullName.split(' ')[0] || '' : '',
    lastName: user?.fullName ? user.fullName.split(' ').slice(1).join(' ') || '' : '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: '',
    state: 'West Bengal',
    pincode: '',
    description: '',
  })

  // Shipping Method ('standard' | 'express')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  // Discount code in Order Summary left panel
  const [promoCode, setPromoCode] = useState('')
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin?returnTo=/checkout', { replace: true })
    }
  }, [authLoading, navigate, user])

  useEffect(() => {
    if (user) {
      setShippingData((prev) => {
        const names = (user.fullName || '').split(' ')
        return {
          ...prev,
          email: prev.email || user.email || '',
          firstName: prev.firstName || names[0] || '',
          lastName: prev.lastName || names.slice(1).join(' ') || '',
          phone: prev.phone || user.phone || '',
        }
      })
    }
  }, [user])

  // Load user saved addresses
  useEffect(() => {
    if (!user) return
    let active = true
    const loadAddresses = async () => {
      try {
        const response = await addressService.getAddresses()
        if (response.success && active) {
          const mapped = response.data.map(toAddressData)
          setSavedAddresses(mapped)
          const defaultAddr = mapped.find((a) => a.isDefault) || mapped[0]
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id)
          }
        }
      } catch (reason) {
        if (active) {
          showToast(
            reason instanceof Error ? reason.message : 'Unable to load saved addresses.',
            'error'
          )
        }
      }
    }
    void loadAddresses()
    return () => {
      active = false
    }
  }, [showToast, user])

  useEffect(() => {
    if (!user || items.length === 0 || hasUnmergedItems) {
      setQuote(null)
      return
    }

    let active = true
    setQuoteLoading(true)
    setQuoteError(null)
    checkoutService
      .quote(shippingMethod, coupon?.code)
      .then((nextQuote) => {
        if (active) setQuote(nextQuote)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setQuote(null)
        setQuoteError(reason instanceof Error ? reason.message : 'Unable to calculate totals.')
      })
      .finally(() => {
        if (active) setQuoteLoading(false)
      })

    return () => {
      active = false
    }
  }, [coupon?.code, hasUnmergedItems, items, shippingMethod, user])

  // Redirect if cart is empty
  useEffect(() => {
    if (!authLoading && items.length === 0) {
      // Cart is empty, navigate to cart
      navigate('/cart', { replace: true })
    }
  }, [items.length, authLoading, navigate])

  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = promoCode.trim().toUpperCase()
    if (!trimmed || isApplyingPromo) return

    setIsApplyingPromo(true)
    try {
      const ok = await applyCoupon(trimmed)
      if (ok) setPromoCode('')
    } finally {
      setIsApplyingPromo(false)
    }
  }

  // Validate shipping step before continuing to payment
  const handleProceedToPayment = async () => {
    if (items.length === 0) {
      showToast('Your cart is empty.', 'error')
      return
    }

    if (hasUnmergedItems) {
      showToast('Resolve the guest cart items before continuing.', 'error')
      return
    }

    if (!quote || quoteLoading || quoteError) {
      showToast(quoteError ?? 'Please wait while totals are verified.', 'error')
      return
    }

    let addressId = selectedAddressId
    if (!addressId) {
      // Validate manual fields
      if (
        !shippingData.firstName.trim() ||
        !shippingData.lastName.trim() ||
        !shippingData.email.trim() ||
        !shippingData.phone.trim() ||
        !shippingData.city.trim() ||
        !shippingData.pincode.trim() ||
        !shippingData.description.trim()
      ) {
        showToast('Please fill in all required shipping address fields (*)', 'error')
        return
      }

      try {
        const created = await addressService.createAddress({
          fullName: `${shippingData.firstName} ${shippingData.lastName}`.trim(),
          label: 'Delivery Address',
          phone: shippingData.phone,
          line1: shippingData.description,
          line2: null,
          city: shippingData.city,
          state: shippingData.state,
          pincode: shippingData.pincode,
          country: 'India',
          isDefault: savedAddresses.length === 0,
        })

        if (!created.success) {
          showToast(created.error.message, 'error')
          return
        }
        addressId = created.data.id
        setSelectedAddressId(addressId)
        setSavedAddresses((prev) => [...prev, toAddressData(created.data)])
      } catch (reason) {
        showToast(
          reason instanceof Error ? reason.message : 'Unable to save this address.',
          'error'
        )
        return
      }
    }

    setSearchParams({ step: 'payment' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const effectiveSubtotalPaisa = quote?.subtotalPaisa ?? 0
  const effectiveDiscountPaisa = quote?.discountAmountPaisa ?? 0
  const effectiveShippingPaisa = quote?.shippingAmountPaisa ?? 0
  const effectiveTotalPaisa = quote?.totalAmountPaisa ?? 0

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-paper)] px-4 py-12">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-10 w-48 rounded-xl bg-[var(--color-surface)]" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="h-96 rounded-3xl bg-[var(--color-surface)] lg:col-span-7" />
            <div className="h-96 rounded-3xl bg-[var(--color-surface)] lg:col-span-5" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Navigation Flow Header */}
        <FlowHeader
          currentStep={currentStep}
          onBack={() => {
            if (currentStep === 'payment') {
              setSearchParams({ step: 'shipping' })
            } else {
              navigate('/cart')
            }
          }}
        />

        {(quoteError || hasUnmergedItems) && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm font-medium text-warning">
            {hasUnmergedItems
              ? 'Some guest cart items could not be merged. Return to the cart and resolve them before checkout.'
              : quoteError}
          </div>
        )}

        {/* STEP 1: SHIPPING STEP (Matches Reference #2) */}
        {currentStep === 'shipping' && (
          <div className="mt-6 sm:mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Shipping Address & Method */}
            <div className="lg:col-span-7 xl:col-span-8">
              <ShippingSection
                shippingData={shippingData}
                onShippingDataChange={setShippingData}
                shippingMethod={shippingMethod}
                onShippingMethodChange={setShippingMethod}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelectSavedAddress={setSelectedAddressId}
                shippingOptions={quote?.shippingMethods}
              />
            </div>

            {/* Right Column: Your Cart Summary */}
            <div className="lg:col-span-5 xl:col-span-4">
              <FlowCartSidebar
                items={items}
                subtotalPaisa={effectiveSubtotalPaisa}
                discountPaisa={effectiveDiscountPaisa}
                shippingPaisa={effectiveShippingPaisa}
                totalPaisa={effectiveTotalPaisa}
                onProceed={handleProceedToPayment}
                buttonLabel="Continue to Payment"
                isProcessing={quoteLoading}
                disabled={Boolean(quoteError || !quote || hasUnmergedItems)}
              />
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT STEP (Matches Reference #1) */}
        {currentStep === 'payment' && (
          <div className="mt-6 sm:mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Order Summary (Reference #1 Left Column) */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-7">
              <section className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-7 shadow-xs space-y-6">
                {/* Header with Items pill badge */}
                <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-ink)]">
                    Order Summary
                  </h2>
                  <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3.5">
                  {items.map((item) => (
                    <FlowItemCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Discount Code Voucher Card */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]/60 p-4 transition-all hover:border-[var(--color-field-border)]">
                  {coupon ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-ink)]">
                            Discount code applied
                          </p>
                          <p className="text-[11px] text-accent font-semibold">
                            {coupon.code} &bull; Save {formatPrice(coupon.discountAmount)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-danger-soft hover:text-danger transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                          <Tag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-ink)]">Discount code</p>
                          <p className="text-[11px] text-[var(--color-muted)]">
                            Have a promo coupon? Save on your order
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleApplyPromoCode} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="h-9 w-32 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-xs uppercase text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isApplyingPromo || !promoCode.trim()}
                          className="flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-[var(--color-ink)] px-3 text-xs font-bold text-white transition-colors hover:bg-[var(--color-primary)] disabled:opacity-40"
                        >
                          <Tag className="h-3 w-3" />
                          <span>{isApplyingPromo ? '...' : 'Add code'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Subtotal / Shipping / Tax / Total Breakdown matching Reference #1 */}
                <div className="space-y-2.5 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[var(--color-ink)]">
                      {formatPrice(effectiveSubtotalPaisa)}
                    </span>
                  </div>

                  {effectiveDiscountPaisa > 0 && (
                    <div className="flex justify-between font-semibold text-accent">
                      <span>Coupon Discount</span>
                      <span>-{formatPrice(effectiveDiscountPaisa)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-[var(--color-ink)]">
                      {effectiveShippingPaisa === 0 ? (
                        <span className="text-accent font-bold">Free</span>
                      ) : (
                        formatPrice(effectiveShippingPaisa)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      Tax
                      <HelpCircle className="h-3 w-3 text-[var(--color-muted)]" />
                    </span>
                    <span className="font-semibold text-[var(--color-ink)]">₹0.00 (Included)</span>
                  </div>

                  <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-base font-bold text-[var(--color-ink)]">
                    <span>Total</span>
                    <span className="font-sans text-xl font-bold text-[var(--color-ink)]">
                      {formatPrice(effectiveTotalPaisa)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Recommended For You Upsell Carousel matching bottom-left of Reference #1 */}
              <RecommendedUpsell />
            </div>

            {/* Right Column: Payment Form (Reference #1 Right Column) */}
            <div className="lg:col-span-5 xl:col-span-5">
              <PaymentUnavailable
                onBack={() => {
                  setSearchParams({ step: 'shipping' })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default CheckoutPage
