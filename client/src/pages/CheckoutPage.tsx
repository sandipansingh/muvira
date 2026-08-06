import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { CheckoutSteps } from '../components/checkout/CheckoutSteps'
import { ContactForm } from '../components/checkout/ContactForm'
import { AddressSelector, type AddressData } from '../components/checkout/AddressSelector'
import { DeliveryMethod } from '../components/checkout/DeliveryMethod'
import { OrderSummaryCard } from '../components/checkout/OrderSummaryCard'

export const CheckoutPage: React.FC = () => {
  const { items, subtotalPaisa, discountPaisa, shippingPaisa, totalPaisa, clearCart } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('priya.nair@email.com')
  const [subscribeToUpdates, setSubscribeToUpdates] = useState(true)
  const [deliveryMethod, setDeliveryMethod] = useState<'white_glove' | 'standard'>('white_glove')
  const [isProcessing, setIsProcessing] = useState(false)

  const [addresses, setAddresses] = useState<AddressData[]>([
    {
      id: 'addr-1',
      fullName: 'Priya Nair',
      label: 'Home',
      streetAddress: '221 Birchwood Lane, Apt 4B',
      city: 'Austin',
      state: 'TX',
      pincode: '78701',
      phone: '(512) 555-0148',
      isDefault: true,
    },
    {
      id: 'addr-2',
      fullName: 'Priya Nair',
      label: 'Office',
      streetAddress: '900 Congress Ave, Suite 220',
      city: 'Austin',
      state: 'TX',
      pincode: '78704',
      phone: '(512) 555-0148',
      isDefault: false,
    },
  ])
  const [selectedAddressId, setSelectedAddressId] = useState('addr-1')

  const handleAddNewAddress = (newAddr: Omit<AddressData, 'id'>) => {
    const id = `addr-${Date.now()}`
    const created = { id, ...newAddr }
    setAddresses((prev) => [...prev, created])
    setSelectedAddressId(id)
    showToast('New address saved!', 'success')
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0) return
    setIsProcessing(true)

    // Simulate Razorpay Payment & Order Creation
    setTimeout(() => {
      setIsProcessing(false)
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`
      clearCart()
      showToast('Payment verified successfully!', 'success')
      navigate(`/orders/success?orderId=${orderId}`)
    }, 1500)
  }

  return (
    <main className="bg-[#FDFBF7] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Step Indicator */}
        <CheckoutSteps currentStep="shipping" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left: Checkout Forms */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="font-serif text-3xl font-bold text-zinc-900">Checkout</h1>

            {/* Contact Information Card */}
            <ContactForm
              email={email}
              setEmail={setEmail}
              subscribeToUpdates={subscribeToUpdates}
              setSubscribeToUpdates={setSubscribeToUpdates}
            />

            {/* Delivery Address Selector Card */}
            <AddressSelector
              selectedAddressId={selectedAddressId}
              onSelectAddressId={setSelectedAddressId}
              addresses={addresses}
              onAddNewAddress={handleAddNewAddress}
            />

            {/* Delivery Method Options */}
            <DeliveryMethod
              method={deliveryMethod}
              setMethod={setDeliveryMethod}
              isFreeShipping={shippingPaisa === 0}
            />
          </div>

          {/* Right: Order Summary Sidebar */}
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
