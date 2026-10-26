interface RefundPayment {
  amount_paisa: number
  refunded_amount_paisa: number
  status: string
}

interface RefundOperation {
  provider: string
  state: string
  amount_paisa: number | null
  local_applied_at: string | null
}

export function refundBalances(payment: RefundPayment | null, operations: RefundOperation[]) {
  const captured =
    payment && ['captured', 'refunded'].includes(payment.status) ? payment.amount_paisa : 0
  const refunded = payment?.refunded_amount_paisa ?? 0
  const unresolved = operations.filter(
    (operation) => operation.provider === 'razorpay' && !operation.local_applied_at
  )
  const reserved = unresolved
    .filter((operation) => operation.state !== 'provider_failed')
    .reduce((total, operation) => total + (operation.amount_paisa ?? 0), 0)
  return {
    captured_paisa: captured,
    refunded_paisa: refunded,
    reserved_paisa: reserved,
    refundable_paisa: Math.max(0, captured - refunded - reserved),
    requires_review: unresolved.some((operation) =>
      ['provider_failed', 'manual_review'].includes(operation.state)
    ),
  }
}
