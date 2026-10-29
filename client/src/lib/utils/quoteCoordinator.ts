import type { CartItem } from '../types/cart'
import type { ShippingMethod } from '../../types/checkout'

export interface QuoteContext {
  accountId: string
  items: CartItem[]
  couponCode?: string
  shippingMethod: ShippingMethod
  addressId?: string
  addressKey?: string
}

export function checkoutQuoteKey(context: QuoteContext): string {
  return JSON.stringify([
    context.accountId,
    context.items
      .map(({ productId, quantity, unitPrice, inStock, availableStock }) => [
        productId,
        quantity,
        unitPrice,
        inStock,
        availableStock,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    context.couponCode?.trim().toUpperCase() || '',
    context.shippingMethod,
    context.addressId || '',
    context.addressKey || '',
  ])
}

export function createQuoteCoordinator<T>(
  load: (context: QuoteContext) => Promise<T>,
  now = Date.now
) {
  let account: string | undefined
  let generation = 0
  const cache = new Map<string, { value: T; at: number }>()
  const pending = new Map<string, Promise<T>>()
  const setAccount = (next?: string) => {
    if (next === account) return
    account = next
    generation++
    cache.clear()
    pending.clear()
  }
  const request = (context: QuoteContext, force = false): Promise<T> => {
    setAccount(context.accountId)
    const key = checkoutQuoteKey(context)
    const version = generation
    const cached = cache.get(key)
    if (!force && cached && now() - cached.at < 30_000) return Promise.resolve(cached.value)
    const inFlight = pending.get(key)
    if (inFlight) return inFlight
    const promise = load(context)
      .then((value) => {
        if (generation === version) cache.set(key, { value, at: now() })
        return value
      })
      .finally(() => {
        if (pending.get(key) === promise) pending.delete(key)
      })
    pending.set(key, promise)
    return promise
  }
  return { request, setAccount }
}
