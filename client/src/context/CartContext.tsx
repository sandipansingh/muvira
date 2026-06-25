import React, { createContext, useContext, useState, useEffect } from "react";
import type { Cart } from "../types/cart";
import type { CouponPreview } from "../types/coupon";
import { cartApiService } from "../lib/api/cart";
import { couponsApiService } from "../lib/api/coupons";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { useSiteSettings } from "./SiteSettingsContext";

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

interface CartContextType {
  cart: Cart;
  coupon: CouponPreview | null;
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  applyCouponCode: (code: string) => Promise<boolean>;
  removeCouponCode: () => Promise<void>;
  clearCartState: () => void;
  shippingAmount: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  // Load cart from server whenever auth state changes
  useEffect(() => {
    const fetchCart = async () => {
      if (!isAuthenticated) {
        setCart(EMPTY_CART);
        setCoupon(null);
        return;
      }
      setLoading(true);
      const res = await cartApiService.getCart();
      if (res.success) setCart(res.data);
      setLoading(false);
    };

    fetchCart();
  }, [isAuthenticated]);

  const addToCart = async (
    productId: string,
    quantity: number,
  ): Promise<boolean> => {
    setLoading(true);
    const res = await cartApiService.addToCart(productId, quantity);
    if (res.success) {
      // Reload cart to get updated subtotals
      const cartRes = await cartApiService.getCart();
      if (cartRes.success) setCart(cartRes.data);
      showToast(`${res.data.productName} added to cart`, "success");
      setLoading(false);
      return true;
    }
    showToast(res.error.message || "Failed to add item", "error");
    setLoading(false);
    return false;
  };

  const updateQuantity = async (
    itemId: string,
    quantity: number,
  ): Promise<boolean> => {
    setLoading(true);
    const res = await cartApiService.updateCartItem(itemId, quantity);
    if (res.success) {
      setCart(res.data);
      // Re-validate coupon against new subtotal
      if (coupon) {
        const previewRes = await couponsApiService.applyCoupon(
          coupon.code,
          res.data.subtotal,
        );
        setCoupon(previewRes.success ? previewRes.data : null);
        if (!previewRes.success)
          showToast("Coupon removed — cart total fell below minimum.", "info");
      }
      setLoading(false);
      return true;
    }
    showToast(res.error.message || "Failed to update quantity", "error");
    setLoading(false);
    return false;
  };

  const removeFromCart = async (itemId: string): Promise<boolean> => {
    setLoading(true);
    const res = await cartApiService.deleteCartItem(itemId);
    if (res.success) {
      const cartRes = await cartApiService.getCart();
      if (cartRes.success) {
        setCart(cartRes.data);
        if (coupon) {
          const previewRes = await couponsApiService.applyCoupon(
            coupon.code,
            cartRes.data.subtotal,
          );
          setCoupon(previewRes.success ? previewRes.data : null);
          if (!previewRes.success)
            showToast(
              "Coupon removed — cart total fell below minimum.",
              "info",
            );
        }
      }
      showToast("Item removed from cart", "success");
      setLoading(false);
      return true;
    }
    showToast(res.error.message || "Failed to remove item", "error");
    setLoading(false);
    return false;
  };

  const applyCouponCode = async (code: string): Promise<boolean> => {
    setLoading(true);
    const res = await couponsApiService.applyCoupon(code, cart.subtotal);
    setLoading(false);
    if (res.success) {
      setCoupon(res.data);
      showToast(`Coupon "${code}" applied!`, "success");
      return true;
    }
    showToast(res.error.message || "Invalid coupon", "error");
    return false;
  };

  const removeCouponCode = async () => {
    await couponsApiService.removeCoupon();
    setCoupon(null);
    showToast("Coupon removed", "info");
  };

  const clearCartState = () => {
    setCart(EMPTY_CART);
    setCoupon(null);
  };

  const { settings } = useSiteSettings();
  const discountAmount = coupon ? coupon.discountAmount : 0;
  const discountedSubtotal = cart.subtotal - discountAmount;

  let shippingAmount = 0;
  if (cart.items.length > 0 && settings?.shippingRules) {
    const { shippingChargePaisa, freeShippingThresholdPaisa } = settings.shippingRules;
    if (freeShippingThresholdPaisa > 0 && discountedSubtotal >= freeShippingThresholdPaisa) {
      shippingAmount = 0;
    } else {
      shippingAmount = shippingChargePaisa;
    }
  }

  const totalAmount = discountedSubtotal + shippingAmount;

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
