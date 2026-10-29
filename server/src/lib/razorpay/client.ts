import type { Orders } from 'razorpay/dist/types/orders'
import type { Payments } from 'razorpay/dist/types/payments'
import type { Refunds } from 'razorpay/dist/types/refunds'
import { env } from '../../config/env'

export class RazorpayRequestError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number | null,
    readonly definitive: boolean
  ) {
    super(`Payment provider request failed (${code})`)
    this.name = 'RazorpayRequestError'
  }
}

export async function razorpayRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  idempotencyKey?: string
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method,
      signal: controller.signal,
      redirect: 'error',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Refund-Idempotency': idempotencyKey } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const payload: unknown = await response.json()
    if (!response.ok) {
      const candidate =
        payload && typeof payload === 'object' && 'error' in payload ? payload.error : null
      const code =
        candidate &&
        typeof candidate === 'object' &&
        'code' in candidate &&
        typeof candidate.code === 'string' &&
        /^[A-Z_]{1,80}$/.test(candidate.code)
          ? candidate.code
          : 'PROVIDER_ERROR'
      throw new RazorpayRequestError(
        code,
        response.status,
        response.status >= 400 &&
          response.status < 500 &&
          ![408, 409, 429].includes(response.status)
      )
    }
    if (!payload || typeof payload !== 'object')
      throw new RazorpayRequestError('INVALID_RESPONSE', response.status, false)
    return payload as T
  } catch (error) {
    if (error instanceof RazorpayRequestError) throw error
    throw new RazorpayRequestError(
      controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'TRANSPORT_ERROR',
      null,
      false
    )
  } finally {
    clearTimeout(timer)
  }
}

function providerId(value: string, prefix: string): string {
  if (!new RegExp(`^${prefix}_[A-Za-z0-9]{1,90}$`).test(value))
    throw new RazorpayRequestError('INVALID_IDENTIFIER', null, true)
  return value
}
function query(params: object = {}): string {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]): [string, string] => [key, String(value)])
  ).toString()
}

export const razorpay = {
  orders: {
    create: (body: Orders.RazorpayOrderCreateRequestBody) =>
      razorpayRequest<Orders.RazorpayOrder>('POST', 'orders', body),
    fetch: (id: string) =>
      razorpayRequest<Orders.RazorpayOrder>('GET', `orders/${providerId(id, 'order')}`),
    all: (params?: Orders.RazorpayOrderQuery) =>
      razorpayRequest<{ items: Orders.RazorpayOrder[] }>('GET', `orders?${query(params)}`),
    fetchPayments: (id: string) =>
      razorpayRequest<{ items: Payments.RazorpayPayment[] }>(
        'GET',
        `orders/${providerId(id, 'order')}/payments`
      ),
  },
  payments: {
    fetch: (id: string) =>
      razorpayRequest<Payments.RazorpayPayment>('GET', `payments/${providerId(id, 'pay')}`),
    fetchMultipleRefund: (id: string, params?: { count?: number; skip?: number }) =>
      razorpayRequest<{ items: Refunds.RazorpayRefund[] }>(
        'GET',
        `payments/${providerId(id, 'pay')}/refunds?${query(params)}`
      ),
    refund: (id: string, body: Refunds.RazorpayRefundCreateRequestBody, key?: string) => {
      if (!key || !/^[A-Za-z0-9_-]{10,100}$/.test(key))
        throw new RazorpayRequestError('REFUND_KEY_REQUIRED', null, true)
      return razorpayRequest<Refunds.RazorpayRefund>(
        'POST',
        `payments/${providerId(id, 'pay')}/refund`,
        body,
        key
      )
    },
  },
}
