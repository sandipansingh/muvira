import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ProductDetail, ProductListItem } from '../lib/types/product'
import type { CartItem } from '../lib/types/cart'
import type { CouponPreview } from '../lib/types/coupon'
import { cartApiService } from '../lib/services/cart.service'
import { useLocation } from 'react-router-dom'
import { checkoutQuotes } from '../lib/services/checkoutQuote.service'
import { useCheckoutQuote } from '../lib/hooks/useCheckoutQuote'
import type { CheckoutQuote, ShippingMethod } from '../types/checkout'
import { MAX_CART_ITEM_QTY } from '../lib/constants/cart.constants'
import { guestCartStore } from '../lib/services/guestCart.store'
import { addGuestCartItem } from '../lib/utils/cartState'
import { useAuth } from './AuthContext'
import { useSiteSettings } from './SiteSettingsContext'
import { useToast } from './ToastContext'

interface CartContextType {
  items: CartItem[]
  addToCart: (product: ProductDetail | ProductListItem, quantity?: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, delta: number) => Promise<void>
  clearCart: () => Promise<void>
  resetAfterOrder: () => Promise<void>
  setCheckoutDelivery: (context: {
    shippingMethod: ShippingMethod
    addressId?: string
    addressKey?: string
  }) => void
  coupon: CouponPreview | null
  applyCoupon: (code: string) => Promise<boolean>
  removeCoupon: () => void
  itemCount: number
  subtotalPaisa: number
  discountPaisa: number
  shippingPaisa: number
  totalPaisa: number
  freeShippingThresholdPaisa: number
  amountForFreeShippingPaisa: number
  loading: boolean
  error: string | null
  status: 'loading' | 'merging' | 'ready' | 'error'
  retry: () => void
  hasUnmergedItems: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)
function isGuestItem(item: CartItem): boolean {
  return item.id.startsWith('guest-')
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const { pathname } = useLocation()
  const checkoutOwnsQuotes = ['/checkout', '/cart'].includes(pathname)
  const delivery = useRef<{
    shippingMethod: ShippingMethod
    addressId?: string
    addressKey?: string
  }>({ shippingMethod: 'standard' })
  const setCheckoutDelivery = useCallback((context: typeof delivery.current) => {
    delivery.current = context
  }, [])
  const { settings, error: settingsError } = useSiteSettings()
  const { showToast } = useToast()
  const [items, setItems] = useState<CartItem[]>([])
  const [coupon, setCoupon] = useState<CouponPreview | null>(null)
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'loading' | 'merging' | 'ready' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const retry = () => setRetryCount((value) => value + 1)
  const [error, setError] = useState<string | null>(null)
  const userId = user?.id
  const sessionRef = useRef(userId)
  const epochRef = useRef(0)
  if (sessionRef.current !== user?.id) {
    sessionRef.current = user?.id
    epochRef.current++
  }
  const [itemsOwner, setItemsOwner] = useState<string | undefined>(undefined)
  const sessionReady = itemsOwner === user?.id && !authLoading

  const refreshServerCart = useCallback(async (accountId: string): Promise<CartItem[]> => {
    const epoch = epochRef.current
    const response = await cartApiService.getCart(accountId)
    if (!response.success) throw new Error(response.error.message)
    if (epoch === epochRef.current && sessionRef.current === accountId) {
      const saved = await guestCartStore.read()
      if (epoch === epochRef.current && sessionRef.current === accountId)
        setItems([
          ...response.data.items,
          ...saved.operations
            .filter((operation) => operation.userId === accountId)
            .map((operation) => ({ ...operation.item, id: `guest-transfer-${operation.id}` })),
        ])
    }
    return response.data.items
  }, [])

  useEffect(() => {
    const epoch = ++epochRef.current
    let active = true
    const current = () => active && epoch === epochRef.current
    setItemsOwner(userId)
    setItems([])
    setCoupon(null)
    setCheckoutQuote(null)
    setLoading(true)
    setStatus('loading')
    setError(null)
    if (authLoading) return
    const synchronize = async () => {
      try {
        if (!userId) {
          const saved = await guestCartStore.read()
          if (current()) {
            setItems(saved.guest)
            setStatus('ready')
          }
          return
        }
        const operations = await guestCartStore.claim(userId)
        if (current()) setStatus('merging')
        for (const operation of operations) {
          if (!current()) return
          if (operation.status === 'rejected') continue
          const response = await cartApiService.mergeGuestItem(
            operation.id,
            operation.item.productId,
            operation.item.quantity,
            operation.userId
          )
          if (!response.success || !response.data)
            throw new Error(
              response.error?.message ??
                'Unable to transfer saved cart. Retry to confirm its status.'
            )
          // Persist acknowledgement before any refresh, including if the account changed in flight.
          if (response.data.status === 'applied') await guestCartStore.acknowledge(operation.id)
          else if (response.data.status === 'rejected') await guestCartStore.reject(operation.id)
          else
            throw new Error('Cart transfer confirmation is invalid. Retry to confirm its status.')
        }
        if (!current()) return
        const response = await cartApiService.getCart(userId)
        if (!response.success) throw new Error(response.error.message)
        const saved = await guestCartStore.read()
        const remaining = saved.operations.filter((operation) => operation.userId === userId)
        if (current()) {
          setItems([
            ...response.data.items,
            ...remaining.map((operation) => ({
              ...operation.item,
              id: `guest-transfer-${operation.id}`,
            })),
          ])
          setStatus('ready')
          if (remaining.length)
            setError(
              'Some saved items are unavailable. Remove them or correct their quantity, then retry.'
            )
        }
      } catch (reason) {
        if (current()) {
          setStatus('error')
          setError(
            reason instanceof Error ? reason.message : 'Unable to load your cart. Please retry.'
          )
        }
      } finally {
        if (current()) setLoading(false)
      }
    }
    void synchronize()
    return () => {
      active = false
    }
  }, [authLoading, userId, retryCount])

  const persistGuest = async (mutate: (previous: CartItem[]) => CartItem[]) => {
    try {
      const saved = await guestCartStore.edit(mutate)
      if (!sessionRef.current) setItems(saved)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your cart.')
      setStatus('error')
      throw reason
    }
  }

  const addToCart = async (product: ProductDetail | ProductListItem, quantity = 1) => {
    const requestedQuantity = Math.min(Math.max(1, quantity), MAX_CART_ITEM_QTY)
    if (status !== 'ready' || !sessionReady)
      throw new Error('Wait for your cart to load, or retry loading it.')
    const mutationEpoch = epochRef.current
    setError(null)

    if (!user) {
      const result = addGuestCartItem(items, product, requestedQuantity)
      if (result.error) {
        setError(result.error)
        showToast(result.error, 'error')
        throw new Error(result.error)
      }

      await persistGuest((previous) => {
        const next = addGuestCartItem(previous, product, requestedQuantity)
        if (next.error) throw new Error(next.error)
        return next.items
      })
      if (mutationEpoch !== epochRef.current)
        throw new Error('Your account changed. Add the item again.')
      setCoupon(null)
      setCheckoutQuote(null)
      showToast(product.name, 'success', 'Added to bag')
      return
    }

    setLoading(true)
    try {
      const response = await cartApiService.addToCart(product.id, requestedQuantity, user!.id)
      if (mutationEpoch !== epochRef.current)
        throw new Error('Your account changed. Add the item again.')
      if (!response.success) throw new Error(response.error.message)
      await refreshServerCart(user!.id)
      if (mutationEpoch !== epochRef.current)
        throw new Error('Your account changed. Add the item again.')
      setCoupon(null)
      setCheckoutQuote(null)
      showToast(product.name, 'success', 'Added to bag')
    } catch (reason) {
      if (mutationEpoch !== epochRef.current)
        throw new Error('Your account changed. Add the item again.')
      const message = reason instanceof Error ? reason.message : 'Unable to add this item to cart.'
      setError(message)
      showToast(message, 'error')
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      if (mutationEpoch === epochRef.current) setLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    if (status !== 'ready' || !sessionReady)
      throw new Error('Wait for your cart to load, or retry loading it.')
    const item = items.find((candidate) => candidate.id === itemId)
    if (!item) return

    if (isGuestItem(item)) {
      if (user) {
        await guestCartStore.correct(user.id, itemId.replace('guest-transfer-', ''), 0)
        retry()
      } else
        await persistGuest((previous) => previous.filter((candidate) => candidate.id !== itemId))
      setCoupon(null)
      setCheckoutQuote(null)
      showToast('Item removed from cart', 'info')
      return
    }

    const mutationEpoch = epochRef.current
    setLoading(true)
    try {
      const response = await cartApiService.deleteCartItem(item.id, user!.id)
      if (mutationEpoch !== epochRef.current) return
      if (!response.success) throw new Error(response.error.message)
      await refreshServerCart(user!.id)
      if (mutationEpoch !== epochRef.current) return
      setCoupon(null)
      setCheckoutQuote(null)
      showToast('Item removed from cart', 'info')
    } catch (reason) {
      if (mutationEpoch !== epochRef.current) return
      const message = reason instanceof Error ? reason.message : 'Unable to remove this item.'
      setError(message)
      showToast(message, 'error')
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      if (mutationEpoch === epochRef.current) setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, delta: number) => {
    if (status !== 'ready' || !sessionReady)
      throw new Error('Wait for your cart to load, or retry loading it.')
    const item = items.find((candidate) => candidate.id === itemId)
    if (!item) return
    const nextQuantity = item.quantity + delta

    if (nextQuantity <= 0) {
      await removeFromCart(itemId)
      return
    }

    if (isGuestItem(item)) {
      const boundedQuantity = Math.min(nextQuantity, MAX_CART_ITEM_QTY, item.availableStock)
      if (nextQuantity > boundedQuantity) {
        const message = `Only ${item.availableStock} units available`
        setError(message)
        showToast(message, 'error')
        throw new Error(message)
      }
      if (user) {
        await guestCartStore.correct(
          user.id,
          itemId.replace('guest-transfer-', ''),
          boundedQuantity
        )
        retry()
        return
      }
      await persistGuest((previous) =>
        previous.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                quantity: boundedQuantity,
                lineTotal: candidate.unitPrice * boundedQuantity,
              }
            : candidate
        )
      )
      setCoupon(null)
      setCheckoutQuote(null)
      return
    }

    const mutationEpoch = epochRef.current
    setLoading(true)
    try {
      const response = await cartApiService.updateCartItem(
        item.id,
        Math.min(nextQuantity, MAX_CART_ITEM_QTY),
        user!.id
      )
      if (mutationEpoch !== epochRef.current) return
      if (!response.success) throw new Error(response.error.message)
      await refreshServerCart(user!.id)
      if (mutationEpoch !== epochRef.current) return
      setCoupon(null)
      setCheckoutQuote(null)
    } catch (reason) {
      if (mutationEpoch !== epochRef.current) return
      const message = reason instanceof Error ? reason.message : 'Unable to update cart quantity.'
      setError(message)
      showToast(message, 'error')
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      if (mutationEpoch === epochRef.current) setLoading(false)
    }
  }

  const clearCart = async () => {
    if (status !== 'ready' || !sessionReady)
      throw new Error('Wait for your cart to load, or retry loading it.')
    const mutationEpoch = epochRef.current
    setLoading(true)
    try {
      if (user) {
        await guestCartStore.assertClearable(user.id)
        if (mutationEpoch !== epochRef.current) return
        const response = await cartApiService.clearCart(user.id)
        if (!response.success) throw new Error(response.error.message)
      }
      if (mutationEpoch !== epochRef.current) return
      if (user) await guestCartStore.clearRejected(user.id)
      else await persistGuest(() => [])
      if (mutationEpoch !== epochRef.current) return
      setItems([])
      setCoupon(null)
      setCheckoutQuote(null)
    } catch (reason) {
      if (mutationEpoch !== epochRef.current) return
      const message = reason instanceof Error ? reason.message : 'Unable to clear your cart.'
      setError(message)
      showToast(message, 'error')
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      if (mutationEpoch === epochRef.current) setLoading(false)
    }
  }

  const resetAfterOrder = useCallback(async () => {
    const mutationEpoch = epochRef.current
    setCoupon(null)
    setCheckoutQuote(null)
    if (!userId) return
    try {
      await refreshServerCart(userId)
    } catch (reason) {
      if (mutationEpoch !== epochRef.current) return
      setError(
        reason instanceof Error ? reason.message : 'Unable to refresh your bag. Please retry.'
      )
      setStatus('error')
    }
  }, [userId, refreshServerCart])

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in to apply a coupon.', 'info')
      return false
    }

    const mutationEpoch = epochRef.current
    setLoading(true)
    try {
      const quote = await checkoutQuotes.request({
        accountId: user.id,
        items,
        couponCode: code,
        ...(checkoutOwnsQuotes ? delivery.current : { shippingMethod: 'standard' as const }),
      })
      if (mutationEpoch !== epochRef.current) return false
      if (!quote.coupon) throw new Error('Coupon could not be applied.')
      setCheckoutQuote(quote)
      setCoupon({
        code: quote.coupon.code,
        discountType: quote.coupon.discountType,
        discountValue: quote.coupon.discountValue,
        discountAmount: quote.coupon.discountAmountPaisa,
        newSubtotal: quote.subtotalPaisa - quote.coupon.discountAmountPaisa,
      })
      showToast('Coupon applied successfully.', 'success')
      return true
    } catch (reason) {
      if (mutationEpoch !== epochRef.current) return false
      const message = reason instanceof Error ? reason.message : 'Unable to apply this coupon.'
      setError(message)
      showToast(message, 'error')
      return false
    } finally {
      if (mutationEpoch === epochRef.current) setLoading(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    setCheckoutQuote(null)
    showToast('Coupon removed', 'info')
  }

  useEffect(() => {
    checkoutQuotes.setAccount(userId)
  }, [userId])
  const preview = useCheckoutQuote(
    { accountId: userId || '', items, couponCode: coupon?.code, shippingMethod: 'standard' },
    !checkoutOwnsQuotes &&
      sessionReady &&
      status === 'ready' &&
      !loading &&
      !!userId &&
      !!items.length &&
      !items.some(isGuestItem)
  )
  useEffect(() => {
    if (!checkoutOwnsQuotes) setCheckoutQuote(preview.quote)
    if (preview.error) setError(preview.error)
  }, [checkoutOwnsQuotes, preview.quote, preview.error])

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const localSubtotalPaisa = useMemo(
    () => items.reduce((sum, item) => sum + item.lineTotal, 0),
    [items]
  )
  const hasUnmergedItems = Boolean(user && items.some(isGuestItem))
  const hasAuthoritativeQuote = Boolean(user && checkoutQuote && !hasUnmergedItems)
  const subtotalPaisa = hasAuthoritativeQuote
    ? (checkoutQuote?.subtotalPaisa ?? 0)
    : localSubtotalPaisa
  const discountPaisa = hasAuthoritativeQuote
    ? (checkoutQuote?.discountAmountPaisa ?? 0)
    : (coupon?.discountAmount ?? 0)
  const discountedSubtotal = Math.max(0, subtotalPaisa - discountPaisa)
  const freeShippingThresholdPaisa = 0
  const estimatedShippingPaisa = settings.shippingMethods?.standard.charge_paisa ?? 0
  const shippingPaisa = hasAuthoritativeQuote
    ? (checkoutQuote?.shippingAmountPaisa ?? 0)
    : estimatedShippingPaisa
  const totalPaisa = hasAuthoritativeQuote
    ? (checkoutQuote?.totalAmountPaisa ?? 0)
    : discountedSubtotal + shippingPaisa
  const amountForFreeShippingPaisa = 0

  return (
    <CartContext.Provider
      value={{
        items: sessionReady ? items : [],
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        resetAfterOrder,
        setCheckoutDelivery,
        coupon,
        applyCoupon,
        removeCoupon,
        itemCount,
        subtotalPaisa,
        discountPaisa,
        shippingPaisa,
        totalPaisa,
        freeShippingThresholdPaisa,
        amountForFreeShippingPaisa,
        loading: loading || !sessionReady,
        status: sessionReady ? status : 'loading',
        retry,
        error:
          error ??
          settingsError ??
          (!settings.configuration.shipping_ready
            ? 'Shipping configuration is unavailable. Please try again later.'
            : null),
        hasUnmergedItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
