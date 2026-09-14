import type { CheckoutQuote } from '../../types/checkout'

export function checkoutTotals(quote: CheckoutQuote | null) {
  return {
    subtotalPaisa: quote?.subtotalPaisa ?? 0,
    discountPaisa: quote?.discountAmountPaisa ?? 0,
    shippingPaisa: quote?.shippingAmountPaisa ?? 0,
    totalPaisa: quote?.totalAmountPaisa ?? 0,
  }
}
