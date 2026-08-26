import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from '../lib/types/cart'
import { addressService } from '../lib/services/address.service'
import { orderApiService } from '../lib/services/order.service'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { CheckoutSteps } from '../components/checkout/CheckoutSteps'
import { ContactForm } from '../components/checkout/ContactForm'
import { AddressSelector, type AddressData } from '../components/checkout/AddressSelector'
import { OrderSummaryCard } from '../components/checkout/OrderSummaryCard'
import {
  CustomPaymentSelector,
  type CustomPaymentPayload,
} from '../components/checkout/CustomPaymentSelector'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayCustomOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  method?: string
  'card[number]'?: string
  'card[expiry_month]'?: string
  'card[expiry_year]'?: string
  'card[cvv]'?: string
  'card[name]'?: string
  'upi[vpa]'?: string
  bank?: string
  wallet?: string
  handler: (response: RazorpayPaymentResponse) => void
  modal: { ondismiss: () => void }
}

interface RazorpayInstance {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCustomOptions) => RazorpayInstance
  }
}

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
  const { user, loading: authLoading } = useAuth()
  const {
    items,
    coupon,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa,
    totalPaisa,
    hasUnmergedItems,
    resetAfterOrder,
  } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState(user?.email ?? '')
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Custom Payment Selection State
  const [paymentData, setPaymentData] = useState<CustomPaymentPayload | null>({
    method: 'card',
  })

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin?returnTo=/checkout', { replace: true })
  }, [authLoading, navigate, user])

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    if (!user) return
    let active = true
    const loadAddresses = async () => {
      setLoadingAddresses(true)
      setAddressError(null)
      try {
        const response = await addressService.getAddresses()
        if (!response.success) throw new Error(response.error.message)
        if (active) {
          const mapped = response.data.map(toAddressData)
          setAddresses(mapped)
          setSelectedAddressId(
            mapped.find((address) => address.isDefault)?.id ?? mapped[0]?.id ?? ''
          )
        }
      } catch (reason) {
        if (active)
          setAddressError(reason instanceof Error ? reason.message : 'Unable to load addresses.')
      } finally {
        if (active) setLoadingAddresses(false)
      }
    }
    void loadAddresses()
    return () => {
      active = false
    }
  }, [user])

  const handleAddNewAddress = async (newAddress: Omit<AddressData, 'id'>) => {
    let response
    try {
      response = await addressService.createAddress({
        label: newAddress.label,
        fullName: newAddress.fullName,
        phone: newAddress.phone,
        line1: newAddress.streetAddress,
        line2: newAddress.apartment ?? null,
        city: newAddress.city,
        state: newAddress.state,
        pincode: newAddress.pincode,
        country: 'India',
        isDefault: newAddress.isDefault,
      })
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to save address.', 'error')
      return
    }
    if (!response.success) {
      showToast(response.error.message, 'error')
      return
    }
    const created = toAddressData(response.data)
    setAddresses((previous) => [...previous, created])
    setSelectedAddressId(created.id)
    showToast('New delivery address saved.', 'success')
  }

  const navigateToPaymentFailure = (reason: string, orderId?: string) => {
    const query = new URLSearchParams({ reason })
    if (orderId) query.set('orderId', orderId)
    navigate(`/orders/failure?${query.toString()}`)
  }

  const validatePaymentSelection = (): boolean => {
    if (!paymentData) {
      showToast('Select a payment method before proceeding.', 'error')
      return false
    }

    if (paymentData.method === 'card') {
      const c = paymentData.card
      if (!c || !c.number || c.number.length < 15) {
        showToast('Enter a valid card number.', 'error')
        return false
      }
      if (!c.expiryMonth || !c.expiryYear) {
        showToast('Enter card expiry date (MM/YY).', 'error')
        return false
      }
      if (!c.cvv || c.cvv.length < 3) {
        showToast('Enter card security code (CVV).', 'error')
        return false
      }
      if (!c.name.trim()) {
        showToast('Enter cardholder name.', 'error')
        return false
      }
    } else if (paymentData.method === 'upi') {
      const u = paymentData.upi
      if (!u || !u.vpa || !u.vpa.includes('@')) {
        showToast('Enter a valid UPI VPA (e.g. mobile@upi or username@bank).', 'error')
        return false
      }
    } else if (paymentData.method === 'netbanking') {
      if (!paymentData.netbanking?.bankCode) {
        showToast('Select your bank for Net Banking.', 'error')
        return false
      }
    } else if (paymentData.method === 'wallet') {
      if (!paymentData.wallet?.walletName) {
        showToast('Select a wallet provider.', 'error')
        return false
      }
    }

    return true
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || items.length === 0) {
      showToast('Select a delivery address before continuing.', 'error')
      return
    }
    if (hasUnmergedItems) {
      showToast('Retry saved guest items before placing order.', 'error')
      return
    }
    if (!validatePaymentSelection()) return

    setIsProcessing(true)
    try {
      // Step 1: Create Order on server
      const orderResponse = await orderApiService.createOrder(
        selectedAddressId,
        coupon?.code ?? null
      )
      if (!orderResponse.success) throw new Error(orderResponse.error.message)
      const order = orderResponse.data

      const Razorpay = window.Razorpay
      if (!Razorpay) throw new Error('Razorpay SDK failed to load. Please refresh.')

      // Step 2: Build Custom Checkout Options
      const rzpOptions: RazorpayCustomOptions = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Muvira',
        description: `Order #${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: {
          name: user?.fullName ?? '',
          email,
          contact: user?.phone ?? '',
        },
        handler: (paymentResponse) => {
          void (async () => {
            try {
              const verification = await orderApiService.verifyPayment(
                paymentResponse.razorpay_order_id,
                paymentResponse.razorpay_payment_id,
                paymentResponse.razorpay_signature
              )
              if (!verification.success || !verification.data.verified) {
                throw new Error(
                  verification.success ? 'Payment verification failed.' : verification.error.message
                )
              }
              resetAfterOrder()
              navigate(
                `/orders/success?orderId=${encodeURIComponent(verification.data.orderId)}&orderNumber=${encodeURIComponent(verification.data.orderNumber)}`
              )
            } catch (reason) {
              navigateToPaymentFailure(
                reason instanceof Error ? reason.message : 'Payment verification failed.',
                order.orderId
              )
            } finally {
              setIsProcessing(false)
            }
          })()
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            showToast('Payment was cancelled.', 'error')
          },
        },
      }

      // Attach Custom Payment Parameters
      if (paymentData?.method === 'card' && paymentData.card) {
        rzpOptions.method = 'card'
        rzpOptions['card[number]'] = paymentData.card.number
        rzpOptions['card[expiry_month]'] = paymentData.card.expiryMonth
        rzpOptions['card[expiry_year]'] = paymentData.card.expiryYear
        rzpOptions['card[cvv]'] = paymentData.card.cvv
        rzpOptions['card[name]'] = paymentData.card.name
      } else if (paymentData?.method === 'upi' && paymentData.upi) {
        rzpOptions.method = 'upi'
        rzpOptions['upi[vpa]'] = paymentData.upi.vpa
      } else if (paymentData?.method === 'netbanking' && paymentData.netbanking) {
        rzpOptions.method = 'netbanking'
        rzpOptions.bank = paymentData.netbanking.bankCode
      } else if (paymentData?.method === 'wallet' && paymentData.wallet) {
        rzpOptions.method = 'wallet'
        rzpOptions.wallet = paymentData.wallet.walletName
      }

      // Initiate Custom Razorpay Payment
      const paymentInstance = new Razorpay(rzpOptions)
      paymentInstance.open()
    } catch (reason) {
      setIsProcessing(false)
      navigateToPaymentFailure(
        reason instanceof Error ? reason.message : 'Unable to initiate payment.'
      )
    }
  }

  if (authLoading || !user) {
    return <main className="editorial-page min-h-[60vh]" />
  }

  return (
    <main className="editorial-page py-6 sm:py-10">
      <div className="editorial-container space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shopping Cart', href: '/cart' },
            { label: 'Checkout' },
          ]}
        />

        <CheckoutSteps currentStep="payment" />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <h1 className="heading page-title">Checkout</h1>

            <ContactForm email={email} setEmail={setEmail} />

            {addressError && (
              <p className="rounded-xl border border-danger bg-danger-soft p-4 text-xs font-medium text-danger">
                {addressError}
              </p>
            )}

            {loadingAddresses ? (
              <div className="h-48 animate-pulse rounded-2xl bg-surface" />
            ) : (
              <AddressSelector
                selectedAddressId={selectedAddressId}
                onSelectAddressId={setSelectedAddressId}
                addresses={addresses}
                onAddNewAddress={handleAddNewAddress}
              />
            )}

            {hasUnmergedItems && (
              <p className="rounded-xl border border-warning bg-warning-soft p-4 text-xs font-medium text-warning">
                Some saved guest items could not be merged into your account. Remove them or retry
                adding them before payment.
              </p>
            )}

            {/* Custom Payment Selector UI */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-xs">
              <CustomPaymentSelector onPaymentDataChange={setPaymentData} disabled={isProcessing} />
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <OrderSummaryCard
              items={items}
              subtotalPaisa={subtotalPaisa}
              discountPaisa={discountPaisa}
              shippingPaisa={shippingPaisa}
              totalPaisa={totalPaisa}
              onPlaceOrder={handlePlaceOrder}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default CheckoutPage
