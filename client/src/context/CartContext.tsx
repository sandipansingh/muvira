import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Cart } from '../types/cart';
import type { CouponPreview } from '../types/coupon';
import { cartMockService } from '../mocks/cart.mock';
import { couponsMockService } from '../mocks/coupons.mock';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

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
  taxAmount: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, itemCount: 0 });
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  // Load/sync cart on mount and when authentication status changes
  useEffect(() => {
    const fetchCart = async () => {
      setLoading(true);
      const res = await cartMockService.getCart();
      if (res.success) {
        setCart(res.data);
      }
      setLoading(false);
    };

    fetchCart();
  }, [isAuthenticated]);

  const addToCart = async (productId: string, quantity: number): Promise<boolean> => {
    setLoading(true);
    const res = await cartMockService.addToCart(productId, quantity);
    setLoading(false);

    if (res.success) {
      // Reload cart to update subtotals
      const cartRes = await cartMockService.getCart();
      if (cartRes.success) {
        setCart(cartRes.data);
      }
      showToast(`${res.data.productName} added to cart`, 'success');
      return true;
    } else {
      showToast(res.error.message || 'Failed to add item', 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number): Promise<boolean> => {
    setLoading(true);
    const res = await cartMockService.updateCartItem(itemId, quantity);
    setLoading(false);

    if (res.success) {
      setCart(res.data);
      // Re-apply coupon if present to update discounts on new subtotal
      if (coupon) {
        const previewRes = await couponsMockService.applyCoupon(coupon.code, res.data.subtotal);
        if (previewRes.success) {
          setCoupon(previewRes.data);
        } else {
          setCoupon(null);
          showToast('Coupon removed because cart subtotal fell below criteria.', 'info');
        }
      }
      return true;
    } else {
      showToast(res.error.message || 'Failed to update quantity', 'error');
      return false;
    }
  };

  const removeFromCart = async (itemId: string): Promise<boolean> => {
    setLoading(true);
    const res = await cartMockService.deleteCartItem(itemId);
    setLoading(false);

    if (res.success) {
      const cartRes = await cartMockService.getCart();
      if (cartRes.success) {
        setCart(cartRes.data);
        // Re-apply coupon
        if (coupon) {
          const previewRes = await couponsMockService.applyCoupon(coupon.code, cartRes.data.subtotal);
          if (previewRes.success) {
            setCoupon(previewRes.data);
          } else {
            setCoupon(null);
            showToast('Coupon removed because cart subtotal fell below criteria.', 'info');
          }
        }
      }
      showToast('Item removed from cart', 'success');
      return true;
    } else {
      showToast(res.error.message || 'Failed to remove item', 'error');
      return false;
    }
  };

  const applyCouponCode = async (code: string): Promise<boolean> => {
    setLoading(true);
    const res = await couponsMockService.applyCoupon(code, cart.subtotal);
    setLoading(false);

    if (res.success) {
      setCoupon(res.data);
      showToast(`Coupon "${code}" applied successfully!`, 'success');
      return true;
    } else {
      showToast(res.error.message || 'Failed to apply coupon', 'error');
      return false;
    }
  };

  const removeCouponCode = async () => {
    setLoading(true);
    await couponsMockService.removeCoupon();
    setCoupon(null);
    setLoading(false);
    showToast('Coupon removed', 'info');
  };

  const clearCartState = () => {
    setCart({ items: [], subtotal: 0, itemCount: 0 });
    setCoupon(null);
  };

  const taxAmount = 0; // standard optional tax can be added in order summaries if needed
  const discountAmount = coupon ? coupon.discountAmount : 0;
  const totalAmount = cart.subtotal - discountAmount + taxAmount;

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
        taxAmount,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
