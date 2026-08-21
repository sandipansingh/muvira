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
import { couponApiService } from '../lib/services/coupon.service'
import { MAX_CART_ITEM_QTY } from '../lib/constants/cart.constants'
import { useAuth } from './AuthContext'
import { useSiteSettings } from './SiteSettingsContext'
import { useToast } from './ToastContext'

interface CartContextType {
  items: CartItem[]
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  openCartDrawer: () => void
  closeCartDrawer: () => void
  addToCart: (product: ProductDetail | ProductListItem, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, delta: number) => Promise<void>
  clearCart: () => Promise<void>
  resetAfterOrder: () => void
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
  hasUnmergedItems: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = 'muvira_guest_cart_v1'

function readGuestItems(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    const items = saved ? (JSON.parse(saved) as unknown) : []
    return Array.isArray(items) ? (items as CartItem[]) : []
  } catch {
    return []
  }
}

function isGuestItem(item: CartItem): boolean {
  return item.id.startsWith('guest-')
}

function productImage(product: ProductDetail | ProductListItem): string {
  return 'images' in product ? (product.images[0]?.url ?? '') : product.primaryImageUrl
}

function buildGuestItem(product: ProductDetail | ProductListItem, quantity: number): CartItem {
  return {
    id: `guest-${product.id}`,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productImage: productImage(product),
    unitPrice: product.price,
    quantity,
    lineTotal: product.price * quantity,
    inStock: product.inStock,
    availableStock: product.stock,
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const { settings } = useSiteSettings()
  const { showToast } = useToast()
  const [items, setItems] = useState<CartItem[]>(readGuestItems)
  const [coupon, setCoupon] = useState<CouponPreview | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const guestItemsRef = useRef<CartItem[]>(readGuestItems())
  const mergedUserRef = useRef<string | null>(null)

  const refreshServerCart = useCallback(async (): Promise<CartItem[]> => {
    const response = await cartApiService.getCart()
    if (!response.success) throw new Error(response.error.message)
    setItems(response.data.items)
    return response.data.items
  }, [])

  useEffect(() => {
    const guestItems = items.filter(isGuestItem)
    const persistedItems = !user && guestItems.length === 0 ? guestItemsRef.current : guestItems
    guestItemsRef.current = persistedItems
    try {
      if (persistedItems.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(persistedItems))
      } else localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      setError('Unable to save your guest cart on this device.')
    }
  }, [items, user])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      mergedUserRef.current = null
      setCoupon(null)
      setItems(readGuestItems())
      setLoading(false)
      return
    }

    if (mergedUserRef.current === user.id) return
    mergedUserRef.current = user.id
    let active = true

    const synchronizeCart = async () => {
      setLoading(true)
      setError(null)
      const failedItems: CartItem[] = []

      for (const item of guestItemsRef.current) {
        try {
          const response = await cartApiService.addToCart(item.productId, item.quantity)
          if (!response.success) failedItems.push(item)
        } catch {
          failedItems.push(item)
        }
      }

      try {
        const response = await cartApiService.getCart()
        if (!response.success) throw new Error(response.error.message)
        if (active) {
          setItems([...response.data.items, ...failedItems])
          guestItemsRef.current = failedItems
          if (failedItems.length > 0) {
            setError('Some guest cart items could not be added. They remain saved for retry.')
          }
        }
      } catch (reason) {
        if (active) {
          setItems(failedItems.length > 0 ? failedItems : guestItemsRef.current)
          setError(reason instanceof Error ? reason.message : 'Unable to load your cart.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void synchronizeCart()
    return () => {
      active = false
    }
  }, [authLoading, user])

  const openCartDrawer = () => setIsDrawerOpen(true)
  const closeCartDrawer = () => setIsDrawerOpen(false)

  const addToCart = async (product: ProductDetail | ProductListItem, quantity = 1) => {
    const requestedQuantity = Math.min(Math.max(1, quantity), MAX_CART_ITEM_QTY)
    setError(null)

    if (!user) {
      setItems((previous) => {
        const existing = previous.find((item) => item.productId === product.id)
        if (!existing) return [...previous, buildGuestItem(product, requestedQuantity)]
        const nextQuantity = Math.min(existing.quantity + requestedQuantity, MAX_CART_ITEM_QTY)
        return previous.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQuantity, lineTotal: item.unitPrice * nextQuantity }
            : item
        )
      })
      showToast(product.name, 'success', 'Added to Cart')
      openCartDrawer()
      return
    }

    setLoading(true)
    try {
      const response = await cartApiService.addToCart(product.id, requestedQuantity)
      if (!response.success) throw new Error(response.error.message)
      const failedGuests = guestItemsRef.current.filter((item) => item.productId !== product.id)
      const serverItems = await refreshServerCart()
      setItems([...serverItems, ...failedGuests])
      showToast(product.name, 'success', 'Added to Cart')
      openCartDrawer()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to add this item to cart.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const removeFromCart = async (productId: string) => {
    const item = items.find((candidate) => candidate.productId === productId)
    if (!item) return

    if (isGuestItem(item)) {
      setItems((previous) => previous.filter((candidate) => candidate.productId !== productId))
      showToast('Item removed from cart', 'info')
      return
    }

    setLoading(true)
    try {
      const response = await cartApiService.deleteCartItem(item.id)
      if (!response.success) throw new Error(response.error.message)
      await refreshServerCart()
      setCoupon(null)
      showToast('Item removed from cart', 'info')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to remove this item.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId: string, delta: number) => {
    const item = items.find((candidate) => candidate.productId === productId)
    if (!item) return
    const nextQuantity = item.quantity + delta

    if (nextQuantity <= 0) {
      await removeFromCart(productId)
      return
    }

    if (isGuestItem(item)) {
      const boundedQuantity = Math.min(nextQuantity, MAX_CART_ITEM_QTY)
      setItems((previous) =>
        previous.map((candidate) =>
          candidate.productId === productId
            ? {
                ...candidate,
                quantity: boundedQuantity,
                lineTotal: candidate.unitPrice * boundedQuantity,
              }
            : candidate
        )
      )
      return
    }

    setLoading(true)
    try {
      const response = await cartApiService.updateCartItem(
        item.id,
        Math.min(nextQuantity, MAX_CART_ITEM_QTY)
      )
      if (!response.success) throw new Error(response.error.message)
      await refreshServerCart()
      setCoupon(null)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to update cart quantity.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearCart = async () => {
    const serverItems = items.filter((item) => !isGuestItem(item))
    setLoading(true)
    setItems([])
    setCoupon(null)
    guestItemsRef.current = []
    try {
      await Promise.all(serverItems.map((item) => cartApiService.deleteCartItem(item.id)))
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to clear your cart.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetAfterOrder = () => {
    setItems([])
    setCoupon(null)
    guestItemsRef.current = []
  }

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in to apply a coupon.', 'info')
      return false
    }

    setLoading(true)
    try {
      const response = await couponApiService.applyCoupon(code, subtotalPaisa)
      if (!response.success) throw new Error(response.error.message)
      setCoupon(response.data)
      showToast('Coupon applied successfully.', 'success')
      return true
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to apply this coupon.'
      setError(message)
      showToast(message, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    showToast('Coupon removed', 'info')
  }

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const subtotalPaisa = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items])
  const discountPaisa = coupon?.discountAmount ?? 0
  const discountedSubtotal = Math.max(0, subtotalPaisa - discountPaisa)
  const freeShippingThresholdPaisa = settings.shippingRules.freeShippingThresholdPaisa
  const shippingPaisa =
    discountedSubtotal === 0 ||
    (freeShippingThresholdPaisa > 0 && discountedSubtotal >= freeShippingThresholdPaisa)
      ? 0
      : settings.shippingRules.shippingChargePaisa
  const totalPaisa = discountedSubtotal + shippingPaisa
  const amountForFreeShippingPaisa = Math.max(0, freeShippingThresholdPaisa - discountedSubtotal)
  const hasUnmergedItems = Boolean(user && items.some(isGuestItem))

  return (
    <CartContext.Provider
      value={{
        items,
        isDrawerOpen,
        setIsDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        resetAfterOrder,
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
        loading,
        error,
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
