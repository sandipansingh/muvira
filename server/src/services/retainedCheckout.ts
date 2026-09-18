import { razorpay } from '../lib/razorpay/client'
import { processLateCaptureWatches as processProviderLateCaptureWatches } from './providerOperations'

export type RetainedCheckoutClassification =
  | 'captured'
  | 'terminal_unpaid'
  | 'payable'
  | 'unavailable'
  | 'partial'
  | 'identity_mismatch'

export interface RetainedCheckoutInspection {
  classification: RetainedCheckoutClassification
  providerStatus: string
  amountPaidPaisa: number
  currency: string
  capturedPayment?: {
    id: string
    amountPaisa: number
    currency: string
    method: string
  }
}

export async function inspectRetainedCheckoutProvider(input: {
  razorpayOrderId: string
  amountPaisa: number
  currency: string
}): Promise<RetainedCheckoutInspection> {
  let providerOrder
  try {
    providerOrder = await razorpay.orders.fetch(input.razorpayOrderId)
  } catch {
    return {
      classification: 'unavailable',
      providerStatus: 'provider_unavailable',
      amountPaidPaisa: 0,
      currency: input.currency,
    }
  }

  const providerStatus = String(providerOrder.status).toLowerCase()
  const amountPaidPaisa = Number(providerOrder.amount_paid)
  const currency = String(providerOrder.currency).toUpperCase()
  if (
    providerOrder.id !== input.razorpayOrderId ||
    Number(providerOrder.amount) !== input.amountPaisa ||
    currency !== input.currency ||
    !Number.isSafeInteger(amountPaidPaisa) ||
    amountPaidPaisa < 0
  ) {
    return {
      classification: 'identity_mismatch',
      providerStatus: providerStatus || 'invalid_provider_response',
      amountPaidPaisa:
        Number.isSafeInteger(amountPaidPaisa) && amountPaidPaisa >= 0 ? amountPaidPaisa : 0,
      currency: input.currency,
    }
  }

  if (amountPaidPaisa > 0 && amountPaidPaisa < input.amountPaisa) {
    return { classification: 'partial', providerStatus, amountPaidPaisa, currency }
  }
  if (
    amountPaidPaisa === 0 &&
    ['cancelled', 'closed', 'expired', 'failed'].includes(providerStatus)
  ) {
    return { classification: 'terminal_unpaid', providerStatus, amountPaidPaisa, currency }
  }
  if (providerStatus !== 'paid' || amountPaidPaisa !== input.amountPaisa) {
    return { classification: 'payable', providerStatus, amountPaidPaisa, currency }
  }

  try {
    const providerPayments = await razorpay.orders.fetchPayments(input.razorpayOrderId)
    const captured = providerPayments.items.find(
      (payment) =>
        payment.order_id === input.razorpayOrderId &&
        payment.status === 'captured' &&
        payment.captured === true &&
        Number(payment.amount) === input.amountPaisa &&
        payment.currency === input.currency
    )
    if (!captured) {
      return { classification: 'payable', providerStatus, amountPaidPaisa, currency }
    }
    return {
      classification: 'captured',
      providerStatus,
      amountPaidPaisa,
      currency,
      capturedPayment: {
        id: captured.id,
        amountPaisa: Number(captured.amount),
        currency: captured.currency,
        method: captured.method,
      },
    }
  } catch {
    return {
      classification: 'unavailable',
      providerStatus: 'provider_unavailable',
      amountPaidPaisa,
      currency,
    }
  }
}

export async function processLateCaptureWatches(limit = 20): Promise<number> {
  return processProviderLateCaptureWatches(limit)
}
