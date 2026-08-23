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

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal: { ondismiss: () => void }
}

interface RazorpayInstance {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
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
    showToast('New address saved.', 'success')
  }

  const navigateToPaymentFailure = (reason: string, orderId?: string) => {
    const query = new URLSearchParams({ reason })
    if (orderId) query.set('orderId', orderId)
    navigate(`/orders/failure?${query.toString()}`)
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || items.length === 0) {
      showToast('Select a delivery address before continuing.', 'error')
      return
    }
    if (hasUnmergedItems) {
      showToast('Retry the saved guest items before placing your order.', 'error')
      return
    }

    setIsProcessing(true)
    try {
      const orderResponse = await orderApiService.createOrder(
        selectedAddressId,
        coupon?.code ?? null
      )
      if (!orderResponse.success) throw new Error(orderResponse.error.message)
      const order = orderResponse.data
      const Razorpay = window.Razorpay
      if (!Razorpay) throw new Error('Payment checkout is unavailable. Please try again.')

      const payment = new Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Muvira',
        description: `Order ${order.orderNumber}`,
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
            navigateToPaymentFailure('Payment was cancelled.', order.orderId)
          },
        },
      })
      payment.open()
    } catch (reason) {
      setIsProcessing(false)
      navigateToPaymentFailure(
        reason instanceof Error ? reason.message : 'Unable to start payment.'
      )
    }
  }

  if (authLoading || !user) {
    return <main className="editorial-page" />
  }

  return (
    <main className="editorial-page py-6 sm:py-8">
      <div className="editorial-container space-y-6">
        <CheckoutSteps currentStep="shipping" />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <h1 className="heading page-title">Checkout</h1>
            <ContactForm email={email} setEmail={setEmail} />
            {addressError && (
              <p className="border border-danger bg-danger-soft p-4 text-xs text-danger">
                {addressError}
              </p>
            )}
            {loadingAddresses ? (
              <div className="h-48 animate-pulse bg-surface" />
            ) : (
              <AddressSelector
                selectedAddressId={selectedAddressId}
                onSelectAddressId={setSelectedAddressId}
                addresses={addresses}
                onAddNewAddress={handleAddNewAddress}
              />
            )}
            {hasUnmergedItems && (
              <p className="border border-warning bg-warning-soft p-4 text-xs text-warning">
                Some saved guest items could not be merged into your account. Remove them or retry
                adding them before payment.
              </p>
            )}
          </div>
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
    </main>
  )
}
