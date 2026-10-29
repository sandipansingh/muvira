import { CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react'
import type { PaymentMethod, RazorpayMethods } from '../../types/razorpay'

const CARD_ARTWORK = [
  { code: 'VISA', name: 'Visa', src: '/images/payments/visa.svg' },
  { code: 'MC', name: 'Mastercard', src: '/images/payments/mastercard.svg' },
]
const APP_ARTWORK: Record<string, string> = {
  gpay: '/images/payments/google-pay.svg',
  phonepe: '/images/payments/phonepe.svg',
}
const METHOD_ICONS = { card: CreditCard, upi: Smartphone, netbanking: Landmark, wallet: Wallet }

export function UpiAppArtwork({ code }: { code: string }) {
  return APP_ARTWORK[code] ? (
    <img src={APP_ARTWORK[code]} alt="" width={24} height={24} />
  ) : (
    <Smartphone className="h-5 w-5 text-primary" aria-hidden="true" />
  )
}

export function PaymentArtwork({
  method,
  methods,
}: {
  method: PaymentMethod
  methods: RazorpayMethods | null
}) {
  const cards =
    method === 'card' && methods?.card === true
      ? CARD_ARTWORK.filter((card) => methods.card_networks?.[card.code] === 1)
      : []
  const Icon = METHOD_ICONS[method]
  return (
    <span className="payment-artwork">
      {method === 'upi' && methods?.upi === true ? (
        <img src="/images/payments/upi.svg" alt="" width={36} height={24} />
      ) : cards.length ? (
        cards.map((card) => (
          <img key={card.code} src={card.src} alt={card.name} width={36} height={24} />
        ))
      ) : (
        <span className="payment-artwork__generic" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      )}
    </span>
  )
}
