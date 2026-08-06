import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { ProductDetail, ProductListItem } from '../lib/types/product'
import type { CartItem } from '../lib/types/cart'
import {
  FALLBACK_FREE_THRESHOLD_PAISA,
  FALLBACK_SHIPPING_CHARGE_PAISA,
} from '../lib/constants/shipping.constants'
import { MAX_CART_ITEM_QTY } from '../lib/constants/cart.constants'
import { useToast } from './ToastContext'

interface AppliedCoupon {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
}

interface CartContextType {
  items: CartItem[]
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  openCartDrawer: () => void
  closeCartDrawer: () => void
  addToCart: (product: ProductDetail | ProductListItem, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, delta: number) => void
  clearCart: () => void
  coupon: AppliedCoupon | null
  applyCoupon: (code: string) => boolean
  removeCoupon: () => void
  itemCount: number
  subtotalPaisa: number
  discountPaisa: number
  shippingPaisa: number
  totalPaisa: number
  freeShippingThresholdPaisa: number
  amountForFreeShippingPaisa: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'muvira_cart_items_v2'
const COUPON_STORAGE_KEY = 'muvira_applied_coupon_v2'

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [coupon, setCoupon] = useState<AppliedCoupon | null>(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (err) {
      console.error('Failed to save cart to localStorage', err)
    }
  }, [items])

  useEffect(() => {
    try {
      if (coupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon))
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY)
      }
    } catch (err) {
      console.error('Failed to save coupon to localStorage', err)
    }
  }, [coupon])

  const openCartDrawer = () => setIsDrawerOpen(true)
  const closeCartDrawer = () => setIsDrawerOpen(false)

  const addToCart = (product: ProductDetail | ProductListItem, quantity = 1) => {
    const isDetail = 'images' in product
    const imgUrl = isDetail
      ? (product as ProductDetail).images[0]?.url || ''
      : (product as ProductListItem).primaryImageUrl || ''

    const price = product.price
    const inStock = 'inStock' in product ? product.inStock : true
    const stock = 'stock' in product ? product.stock : 10

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.productId === product.id)
      if (existingIndex > -1) {
        const updated = [...prevItems]
        const newQty = Math.min(updated[existingIndex].quantity + quantity, MAX_CART_ITEM_QTY)
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          lineTotal: price * newQty,
        }
        return updated
      } else {
        const qty = Math.min(quantity, MAX_CART_ITEM_QTY)
        const newItem: CartItem = {
          id: `cart-${product.id}`,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: imgUrl,
          unitPrice: price,
          quantity: qty,
          lineTotal: price * qty,
          inStock,
          availableStock: stock,
        }
        return [...prevItems, newItem]
      }
    })

    showToast(`Added ${product.name} to cart`, 'success')
    openCartDrawer()
  }

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
    showToast('Item removed from cart', 'info')
  }

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            const validQty = Math.min(newQty, MAX_CART_ITEM_QTY)
            return {
              ...item,
              quantity: validQty,
              lineTotal: item.unitPrice * validQty,
            }
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }

  const clearCart = () => {
    setItems([])
    setCoupon(null)
  }

  const applyCoupon = (code: string): boolean => {
    const formattedCode = code.trim().toUpperCase()
    if (formattedCode === 'WELCOME10') {
      const newCoupon: AppliedCoupon = {
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
      }
      setCoupon(newCoupon)
      showToast('10% discount applied!', 'success')
      return true
    } else if (formattedCode === 'FESTIVE500') {
      const newCoupon: AppliedCoupon = {
        code: 'FESTIVE500',
        discountType: 'fixed',
        discountValue: 50000,
      }
      setCoupon(newCoupon)
      showToast('₹500 discount applied!', 'success')
      return true
    } else {
      showToast('Invalid coupon code. Try WELCOME10', 'error')
      return false
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    showToast('Coupon removed', 'info')
  }

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const subtotalPaisa = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  )

  const discountPaisa = useMemo(() => {
    if (!coupon || subtotalPaisa === 0) return 0
    if (coupon.discountType === 'percentage') {
      return Math.round((subtotalPaisa * coupon.discountValue) / 100)
    } else {
      return Math.min(coupon.discountValue, subtotalPaisa)
    }
  }, [coupon, subtotalPaisa])

  const freeShippingThresholdPaisa = FALLBACK_FREE_THRESHOLD_PAISA

  const shippingPaisa = useMemo(() => {
    if (subtotalPaisa === 0 || subtotalPaisa >= freeShippingThresholdPaisa) {
      return 0
    }
    return FALLBACK_SHIPPING_CHARGE_PAISA
  }, [subtotalPaisa, freeShippingThresholdPaisa])

  const amountForFreeShippingPaisa = Math.max(0, freeShippingThresholdPaisa - subtotalPaisa)

  const totalPaisa = Math.max(0, subtotalPaisa - discountPaisa + shippingPaisa)

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
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
