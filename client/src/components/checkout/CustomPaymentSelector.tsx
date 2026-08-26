import React, { useState } from 'react'
import {
  CreditCard,
  QrCode,
  Building2,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'

export type PaymentMethodType = 'card' | 'upi' | 'netbanking' | 'wallet'

export interface CardDetails {
  number: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  name: string
}

export interface UpiDetails {
  vpa: string
}

export interface NetbankingDetails {
  bankCode: string
}

export interface WalletDetails {
  walletName: string
}

export interface CustomPaymentPayload {
  method: PaymentMethodType
  card?: CardDetails
  upi?: UpiDetails
  netbanking?: NetbankingDetails
  wallet?: WalletDetails
}

interface CustomPaymentSelectorProps {
  onPaymentDataChange: (payload: CustomPaymentPayload | null) => void
  disabled?: boolean
}

const POPULAR_BANKS = [
  { code: 'HDFC', name: 'HDFC Bank' },
  { code: 'ICIC', name: 'ICICI Bank' },
  { code: 'SBIN', name: 'State Bank of India' },
  { code: 'UTIB', name: 'Axis Bank' },
  { code: 'KKBK', name: 'Kotak Mahindra Bank' },
  { code: 'INDB', name: 'IndusInd Bank' },
]

const ALL_BANKS = [
  { code: 'HDFC', name: 'HDFC Bank' },
  { code: 'ICIC', name: 'ICICI Bank' },
  { code: 'SBIN', name: 'State Bank of India' },
  { code: 'UTIB', name: 'Axis Bank' },
  { code: 'KKBK', name: 'Kotak Mahindra Bank' },
  { code: 'INDB', name: 'IndusInd Bank' },
  { code: 'YESB', name: 'Yes Bank' },
  { code: 'PNBB', name: 'Punjab National Bank' },
  { code: 'BARB', name: 'Bank of Baroda' },
  { code: 'CNRB', name: 'Canara Bank' },
  { code: 'IDFB', name: 'IDFC FIRST Bank' },
]

const WALLET_PROVIDERS = [
  { code: 'paytm', name: 'Paytm Wallet' },
  { code: 'phonepe', name: 'PhonePe Wallet' },
  { code: 'mobikwik', name: 'MobiKwik' },
  { code: 'freecharge', name: 'Freecharge' },
  { code: 'airtelmoney', name: 'Airtel Money' },
]

export const CustomPaymentSelector: React.FC<CustomPaymentSelectorProps> = ({
  onPaymentDataChange,
  disabled = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card')

  // Card Form State
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')

  // UPI Form State
  const [upiVpa, setUpiVpa] = useState('')

  // Netbanking Form State
  const [selectedBank, setSelectedBank] = useState('HDFC')

  // Wallet Form State
  const [selectedWallet, setSelectedWallet] = useState('paytm')

  // Detect card network
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '')
    if (/^4/.test(clean)) return 'VISA'
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard'
    if (/^(34|37)/.test(clean)) return 'Amex'
    if (/^(60|65|81|82|508)/.test(clean)) return 'RuPay'
    return null
  }

  // Format Card Number (4-4-4-4)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim()
    setCardNumber(formatted)
    notifyChange('card', formatted, cardExpiry, cardCvv, cardName)
  }

  // Format Expiry (MM/YY)
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

  const handleUpiChange = (vpaVal: string) => {
    setUpiVpa(vpaVal)
    onPaymentDataChange({
      method: 'upi',
      upi: { vpa: vpaVal.trim() },
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

  const handleSelectMethod = (method: PaymentMethodType) => {
    setSelectedMethod(method)
    if (method === 'card') {
      notifyChange('card')
    } else if (method === 'upi') {
      handleUpiChange(upiVpa)
    } else if (method === 'netbanking') {
      handleBankChange(selectedBank)
    } else if (method === 'wallet') {
      handleWalletChange(selectedWallet)
    }
  }

  const cardBrand = getCardBrand(cardNumber)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Payment Method</h2>
        <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
          <span className="leading-none">Online & Encrypted</span>
        </span>
      </div>

      {/* Payment Method Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => handleSelectMethod('card')}
          disabled={disabled}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
            selectedMethod === 'card'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]'
          }`}
        >
          <CreditCard className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">Credit/Debit Card</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMethod('upi')}
          disabled={disabled}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
            selectedMethod === 'upi'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]'
          }`}
        >
          <QrCode className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">UPI / QR</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMethod('netbanking')}
          disabled={disabled}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
            selectedMethod === 'netbanking'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]'
          }`}
        >
          <Building2 className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">Net Banking</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMethod('wallet')}
          disabled={disabled}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
            selectedMethod === 'wallet'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-xs'
              : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-field-border)] hover:bg-[var(--color-surface)]'
          }`}
        >
          <Wallet className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">Wallets</span>
        </button>
      </div>

      {/* Dynamic Option Content Panel */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-5">
        {selectedMethod === 'card' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Enter Card Details
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-ink)]">
                  VISA
                </span>
                <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-ink)]">
                  MC
                </span>
                <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-ink)]">
                  RuPay
                </span>
                <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-ink)]">
                  AMEX
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4532 1234 5678 9010"
                  disabled={disabled}
                  className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                {cardBrand && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                    {cardBrand}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                  Expiry Date (MM/YY)
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleCardExpiryChange}
                  placeholder="MM / YY"
                  disabled={disabled}
                  className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                  Security Code (CVV)
                </label>
                <input
                  type="password"
                  value={cardCvv}
                  onChange={handleCardCvvChange}
                  placeholder="123"
                  maxLength={4}
                  disabled={disabled}
                  className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={handleCardNameChange}
                placeholder="Full Name as on card"
                disabled={disabled}
                className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </div>
        )}

        {selectedMethod === 'upi' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                Enter Virtual Payment Address (VPA / UPI ID)
              </label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => handleUpiChange(e.target.value)}
                placeholder="mobile-number@upi / username@okhdfcbank"
                disabled={disabled}
                className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="w-full text-[11px] text-[var(--color-muted)]">Quick handles:</span>
              {['@okicici', '@okhdfcbank', '@paytm', '@ybl', '@axl'].map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    const prefix = upiVpa.split('@')[0] || 'yourname'
                    handleUpiChange(`${prefix}${handle}`)
                  }}
                  className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {handle}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted)]">
              <p className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 shrink-0 text-[var(--color-info)]" />
                <span className="leading-normal">
                  After clicking Pay, you will receive a notification on your UPI app (Google Pay,
                  PhonePe, Paytm, BHIM) to approve the payment.
                </span>
              </p>
            </div>
          </div>
        )}

        {selectedMethod === 'netbanking' && (
          <div className="space-y-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Popular Banks
            </span>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POPULAR_BANKS.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => handleBankChange(bank.code)}
                  disabled={disabled}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    selectedBank === bank.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
                  }`}
                >
                  <span className="text-xs">{bank.name}</span>
                  {selectedBank === bank.code && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
                Or select another bank
              </label>
              <select
                value={selectedBank}
                onChange={(e) => handleBankChange(e.target.value)}
                disabled={disabled}
                className="w-full rounded-lg border border-[var(--color-field-border)] bg-[var(--color-paper)] px-3.5 py-2.5 text-base text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                {ALL_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedMethod === 'wallet' && (
          <div className="space-y-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Select Wallet
            </span>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WALLET_PROVIDERS.map((w) => (
                <button
                  key={w.code}
                  type="button"
                  onClick={() => handleWalletChange(w.code)}
                  disabled={disabled}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    selectedWallet === w.code
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-field-border)]'
                  }`}
                >
                  <span className="text-xs">{w.name}</span>
                  {selectedWallet === w.code && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomPaymentSelector
