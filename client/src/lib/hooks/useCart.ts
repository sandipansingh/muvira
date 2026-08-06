import { useState, useEffect, useCallback } from 'react'
import type { Cart } from '../types/cart'
import type { CouponPreview } from '../types/coupon'
import type { SiteSettings } from '../types/settings'
import { cartApiService } from '../services/cart.service'
import { couponApiService } from '../services/coupon.service'
import { EMPTY_CART } from '../constants/cart.constants'

export interface UseCartReturn {
  cart: Cart
  coupon: CouponPreview | null
  loading: boolean
  addToCart: (productId: string, quantity: number) => Promise<{ success: boolean; productName?: string; error?: string }>
  updateQuantity: (itemId: string, quantity: number) => Promise<{ success: boolean; couponRemoved?: boolean; error?: string }>
  removeFromCart: (itemId: string) => Promise<{ success: boolean; couponRemoved?: boolean; error?: string }>
  applyCouponCode: (code: string) => Promise<{ success: boolean; error?: string }>
  removeCouponCode: () => Promise<void>
  clearCartState: () => void
  shippingAmount: number
  totalAmount: number
}

/**
 * Business logic hook for cart state, coupon application, and shipping/total amount computations.
 * Contains zero UI components or JSX rendering logic.
 */
export function useCart(isAuthenticated = false, settings: SiteSettings | null = null): UseCartReturn {
  const [cart, setCart] = useState<Cart>(EMPTY_CART)
  const [coupon, setCoupon] = useState<CouponPreview | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(EMPTY_CART)
      setCoupon(null)
      return
    }
    setLoading(true)
    const res = await cartApiService.getCart()
    if (res.success) setCart(res.data)
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const addToCart = async (
    productId: string,
    quantity: number
  ): Promise<{ success: boolean; productName?: string; error?: string }> => {
    setLoading(true)
    const res = await cartApiService.addToCart(productId, quantity)
    if (res.success) {
      const cartRes = await cartApiService.getCart()
      if (cartRes.success) setCart(cartRes.data)
      setLoading(false)
      return { success: true, productName: res.data.productName }
    }
    setLoading(false)
    return { success: false, error: res.error.message }
  }

  const updateQuantity = async (
    itemId: string,
    quantity: number
  ): Promise<{ success: boolean; couponRemoved?: boolean; error?: string }> => {
    setLoading(true)
    const res = await cartApiService.updateCartItem(itemId, quantity)
    if (res.success) {
      setCart(res.data)
      let couponRemoved = false
      if (coupon) {
        const previewRes = await couponApiService.applyCoupon(coupon.code, res.data.subtotal)
        setCoupon(previewRes.success ? previewRes.data : null)
        if (!previewRes.success) couponRemoved = true
      }
      setLoading(false)
      return { success: true, couponRemoved }
    }
    setLoading(false)
    return { success: false, error: res.error.message }
  }

  const removeFromCart = async (
    itemId: string
  ): Promise<{ success: boolean; couponRemoved?: boolean; error?: string }> => {
    setLoading(true)
    const res = await cartApiService.deleteCartItem(itemId)
    if (res.success) {
      const cartRes = await cartApiService.getCart()
      let couponRemoved = false
      if (cartRes.success) {
        setCart(cartRes.data)
        if (coupon) {
          const previewRes = await couponApiService.applyCoupon(coupon.code, cartRes.data.subtotal)
          setCoupon(previewRes.success ? previewRes.data : null)
          if (!previewRes.success) couponRemoved = true
        }
      }
      setLoading(false)
      return { success: true, couponRemoved }
    }
    setLoading(false)
    return { success: false, error: res.error.message }
  }

  const applyCouponCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true)
    const res = await couponApiService.applyCoupon(code, cart.subtotal)
    setLoading(false)
    if (res.success) {
      setCoupon(res.data)
      return { success: true }
    }
    return { success: false, error: res.error.message }
  }

  const removeCouponCode = async () => {
    await couponApiService.removeCoupon()
    setCoupon(null)
  }

  const clearCartState = () => {
    setCart(EMPTY_CART)
    setCoupon(null)
  }

  const discountAmount = coupon ? coupon.discountAmount : 0
  const discountedSubtotal = cart.subtotal - discountAmount

  let shippingAmount = 0
  if (cart.items.length > 0 && settings?.shippingRules) {
    const { shippingChargePaisa, freeShippingThresholdPaisa } = settings.shippingRules
    if (freeShippingThresholdPaisa > 0 && discountedSubtotal >= freeShippingThresholdPaisa) {
      shippingAmount = 0
    } else {
      shippingAmount = shippingChargePaisa
    }
  }

  const totalAmount = discountedSubtotal + shippingAmount

  return {
    cart,
    coupon,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyCouponCode,
    removeCouponCode,
    clearCartState,
    shippingAmount,
    totalAmount,
  }
}
