import React, { useState } from 'react'
import { CreditCard, Lock, QrCode, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react'
import { INDIAN_STATES } from '../../lib/constants/states.constants'
import { formatPrice } from '../../lib/utils/format'
import type { CustomPaymentPayload, PaymentMethodType } from './CustomPaymentSelector'

export interface PaymentSectionProps {
  subtotalPaisa: number
  totalPaisa: number
  email: string
  onEmailChange: (email: string) => void
  onPaymentSubmit: () => void
  isProcessing: boolean
  onPaymentDataChange: (payload: CustomPaymentPayload | null) => void
  shippingAddressText?: string
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  subtotalPaisa,
  totalPaisa,
  email,
  onEmailChange,
  onPaymentSubmit,
  isProcessing,
  onPaymentDataChange,
  shippingAddressText = '27 Park Street',
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'netbanking' | 'wallet'>('card')
  const [expressMethod, setExpressMethod] = useState<'card' | 'applepay' | 'gpay' | 'upi'>('card')

  // Card fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')

  // Address fields
  const [country, setCountry] = useState('India')
  const [streetAddress, setStreetAddress] = useState(shippingAddressText)
  const [state, setState] = useState('West Bengal')
  const [city, setCity] = useState('Kolkata')
  const [zipCode, setZipCode] = useState('700016')
  const [taxId, setTaxId] = useState('')

  // UPI field
  const [upiVpa, setUpiVpa] = useState('')

  // Netbanking field
  const [selectedBank, setSelectedBank] = useState('HDFC')

  // Wallet field
  const [selectedWallet, setSelectedWallet] = useState('paytm')

  // Card brand detection
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '')
    if (/^4/.test(clean)) return 'VISA'
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard'
    if (/^(34|37)/.test(clean)) return 'Amex'
    if (/^(60|65|81|82|508)/.test(clean)) return 'RuPay'
    return null
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim()
    setCardNumber(formatted)
    notifyChange('card', formatted, cardExpiry, cardCvv, cardName)
  }

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 2) {
      const month = Math.min(12, Math.max(1, parseInt(raw.slice(0, 2), 10)))
        .toString()
        .padStart(2, '0')
      raw = month + raw.slice(2)
    }
    const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw
    setCardExpiry(formatted)
    notifyChange('card', cardNumber, formatted, cardCvv, cardName)
  }

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCardCvv(val)
    notifyChange('card', cardNumber, cardExpiry, val, cardName)
  }

  const handleCardNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCardName(val)
    notifyChange('card', cardNumber, cardExpiry, cardCvv, val)
  }

  const handleUpiChange = (val: string) => {
    setUpiVpa(val)
    onPaymentDataChange({
      method: 'upi',
      upi: { vpa: val.trim() },
    })
  }

  const handleBankChange = (bankCode: string) => {
    setSelectedBank(bankCode)
    onPaymentDataChange({
      method: 'netbanking',
      netbanking: { bankCode },
    })
  }

  const handleWalletChange = (walletName: string) => {
    setSelectedWallet(walletName)
    onPaymentDataChange({
      method: 'wallet',
      wallet: { walletName },
    })
  }

  const notifyChange = (
    method: PaymentMethodType,
    cNum = cardNumber,
    cExp = cardExpiry,
    cCvv = cardCvv,
    cName = cardName
  ) => {
    if (method === 'card') {
      const [m, y] = cExp.split('/')
      onPaymentDataChange({
        method: 'card',
        card: {
          number: cNum.replace(/\s/g, ''),
          expiryMonth: m || '',
          expiryYear: y ? (y.length === 2 ? `20${y}` : y) : '',
          cvv: cCvv,
          name: cName,
        },
      })
    }
  }

  const handleSelectTab = (method: 'card' | 'upi' | 'netbanking' | 'wallet') => {
    setActiveTab(method)
    if (method === 'card') {
      setExpressMethod('card')
      notifyChange('card')
    } else if (method === 'upi') {
      setExpressMethod('upi')
      handleUpiChange(upiVpa)
    } else if (method === 'netbanking') {
      handleBankChange(selectedBank)
    } else if (method === 'wallet') {
      handleWalletChange(selectedWallet)
    }
  }

  const cardBrand = getCardBrand(cardNumber)

  return (
    <div className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:p-7 shadow-xs">
      {/* Top Tabs matching Reference #1: Pay by Card | Pay with PayPal / UPI */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-surface)] p-1.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => handleSelectTab('card')}
          className={`cursor-pointer rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'card'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Pay by Card
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('upi')}
          className={`cursor-pointer rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'upi'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          UPI / QR
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('netbanking')}
          className={`cursor-pointer rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'netbanking'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Net Banking
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('wallet')}
          className={`cursor-pointer rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
            activeTab === 'wallet'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Wallets
        </button>
      </div>

      {/* Express Payment Pills Row matching Reference #1 */}
      <div className="grid grid-cols-4 gap-2">
        {/* Card Pill */}
        <button
          type="button"
          onClick={() => {
            setExpressMethod('card')
            handleSelectTab('card')
          }}
          className={`flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
            expressMethod === 'card'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Card</span>
        </button>

        {/* Apple Pay Pill */}
        <button
          type="button"
          onClick={() => {
            setExpressMethod('applepay')
            handleSelectTab('card')
          }}
          className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border text-xs font-bold transition-all ${
            expressMethod === 'applepay'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
          }`}
        >
          <span className="font-serif text-sm">&fnof;</span>
          <span>Apple Pay</span>
        </button>

        {/* Google Pay Pill */}
        <button
          type="button"
          onClick={() => {
            setExpressMethod('gpay')
            handleSelectTab('upi')
          }}
          className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border text-xs font-bold transition-all ${
            expressMethod === 'gpay'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
          }`}
        >
          <span className="font-bold text-blue-600">G</span>
          <span>Pay</span>
        </button>

        {/* UPI Pill */}
        <button
          type="button"
          onClick={() => {
            setExpressMethod('upi')
            handleSelectTab('upi')
          }}
          className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border text-xs font-bold transition-all ${
            expressMethod === 'upi'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>UPI</span>
        </button>
      </div>

      {/* Secure Header matching Reference #1 */}
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
          <span>Secure 256-bit SSL encrypted link</span>
          <ChevronDown className="h-3 w-3 text-[var(--color-muted)]" />
        </div>
        <button
          type="button"
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:underline"
        >
          Learn more
        </button>
      </div>

      {/* Dynamic Payment Form Content */}
      <div className="space-y-4">
        {/* Email Address */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
          />
        </div>

        {/* Card Tab Details matching Reference #1 */}
        {activeTab === 'card' && (
          <div className="space-y-4">
            {/* Card Number with Brands */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Card number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 1234 1234 1234"
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 pr-28 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none font-mono"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {cardBrand ? (
                    <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                      {cardBrand}
                    </span>
                  ) : (
                    <>
                      <span className="rounded bg-[var(--color-line)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-ink)]">
                        VISA
                      </span>
                      <span className="rounded bg-[var(--color-line)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-ink)]">
                        MC
                      </span>
                      <span className="rounded bg-[var(--color-line)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-ink)]">
                        RuPay
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expiration date & Security code (2 cols) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Expiration date
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleCardExpiryChange}
                  placeholder="MM / YY"
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                  Security code
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={handleCardCvvChange}
                    placeholder="123"
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 pr-8 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none font-mono"
                  />
                  <CreditCard className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Cardholder name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={handleCardNameChange}
                placeholder="Full Name as on card"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* UPI Details */}
        {activeTab === 'upi' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                Virtual Payment Address (UPI ID)
              </label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => handleUpiChange(e.target.value)}
                placeholder="mobile@upi / name@okhdfcbank"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['@okhdfcbank', '@okicici', '@paytm', '@ybl'].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const prefix = upiVpa.split('@')[0] || 'user'
                    handleUpiChange(`${prefix}${h}`)
                  }}
                  className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-ink)] hover:border-[var(--color-primary)]"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Netbanking Details */}
        {activeTab === 'netbanking' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--color-ink)]">
              Select Bank
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { code: 'HDFC', name: 'HDFC Bank' },
                { code: 'ICIC', name: 'ICICI Bank' },
                { code: 'SBIN', name: 'State Bank of India' },
                { code: 'UTIB', name: 'Axis Bank' },
                { code: 'KKBK', name: 'Kotak Bank' },
                { code: 'YESB', name: 'Yes Bank' },
              ].map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleBankChange(b.code)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                    selectedBank === b.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
                  }`}
                >
                  <span>{b.name}</span>
                  {selectedBank === b.code && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Details */}
        {activeTab === 'wallet' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--color-ink)]">
              Select Wallet
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'paytm', name: 'Paytm' },
                { code: 'phonepe', name: 'PhonePe' },
                { code: 'mobikwik', name: 'MobiKwik' },
                { code: 'amazonpay', name: 'Amazon Pay' },
              ].map((w) => (
                <button
                  key={w.code}
                  type="button"
                  onClick={() => handleWalletChange(w.code)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                    selectedWallet === w.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
                  }`}
                >
                  <span>{w.name}</span>
                  {selectedWallet === w.code && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Region & Billing Address Section matching Reference #1 */}
        <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
          {/* Country Selector */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
            >
              <option value="India">🇮🇳 India</option>
              <option value="United States">🇺🇸 United States</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="UAE">🇦🇪 United Arab Emirates</option>
            </select>
          </div>

          {/* Street Address with Clear button */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="27 Fredrick Ave Brothers"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 pr-14 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
              {streetAddress && (
                <button
                  type="button"
                  onClick={() => setStreetAddress('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* State Dropdown */}
          <div>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* City & Zip Code (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Los Angeles / City"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
            </div>

            <div>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="94025 / Pincode"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
              />
            </div>
          </div>

          {/* Tax ID (optional) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
              Tax ID number (optional)
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="15978046 / GSTIN"
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-paper)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Subtotal & Total line summaries */}
      <div className="space-y-2 border-t border-[var(--color-line)] pt-4 text-xs">
        <div className="flex justify-between text-[var(--color-muted)]">
          <span>Subtotal</span>
          <span className="font-semibold text-[var(--color-ink)]">
            {formatPrice(subtotalPaisa)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold text-[var(--color-ink)]">
          <span>Total</span>
          <span className="font-sans font-bold text-[var(--color-ink)]">
            {formatPrice(totalPaisa)}
          </span>
        </div>
      </div>

      {/* Pay CTA Button matching Reference #1 */}
      <button
        type="button"
        onClick={onPaymentSubmit}
        disabled={isProcessing}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-4 text-sm sm:text-base font-bold text-white shadow-xs transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
      >
        <span>{isProcessing ? 'Processing payment...' : `Pay ${formatPrice(totalPaisa)}`}</span>
        <Lock className="h-4 w-4 shrink-0" />
      </button>

      {/* Footer info */}
      <div className="text-center text-[11px] text-[var(--color-muted)]">
        Powered by Muvira Gateway &bull; Terms &bull; Privacy
      </div>
    </div>
  )
}

export default PaymentSection
