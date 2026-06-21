import { delay } from './delay';
import { MockDatabase } from './store';
import type { Cart, CartItem } from '../types/cart';
import type { ApiResponse } from '../types/common';

const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const recalculateCart = (items: CartItem[]): Cart => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, itemCount };
};

export const cartMockService = {
  async getCart(): Promise<ApiResponse<Cart>> {
    await delay(150);

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    // Ensure all items are still active and sync prices
    const cart = MockDatabase.getCart();
    const products = MockDatabase.getProducts();

    let changed = false;
    const validatedItems: CartItem[] = [];

    for (const item of cart.items) {
      const prod = products.find((p) => p.id === item.productId && p.isActive);
      if (prod) {
        const unitPrice = prod.salePrice !== null ? prod.salePrice : prod.price;
        const lineTotal = unitPrice * item.quantity;
        const inStock = prod.stock > 0;
        const availableStock = prod.stock;

        if (
          item.unitPrice !== unitPrice ||
          item.inStock !== inStock ||
          item.availableStock !== availableStock
        ) {
          changed = true;
        }

        validatedItems.push({
          ...item,
          productName: prod.name,
          productImage: prod.images.find((img) => img.isPrimary)?.url || prod.images[0]?.url || '',
          unitPrice,
          lineTotal,
          inStock,
          availableStock,
        });
      } else {
        changed = true; // remove inactive/deleted products
      }
    }

    if (changed) {
      const updatedCart = recalculateCart(validatedItems);
      MockDatabase.setCart(updatedCart);
      return { success: true, data: updatedCart };
    }

    return {
      success: true,
      data: cart,
    };
  },

  async addToCart(productId: string, quantity: number): Promise<ApiResponse<CartItem>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const products = MockDatabase.getProducts();
    const product = products.find((p) => p.id === productId && p.isActive);

    if (!product) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found or inactive.' },
      };
    }

    const cart = MockDatabase.getCart();
    const existingIndex = cart.items.findIndex((item) => item.productId === productId);
    const existingQuantity = existingIndex !== -1 ? cart.items[existingIndex].quantity : 0;
    const targetQuantity = existingQuantity + quantity;

    if (targetQuantity > product.stock) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: `Only ${product.stock} items are available in stock.`,
        },
      };
    }

    const unitPrice = product.salePrice !== null ? product.salePrice : product.price;
    const lineTotal = unitPrice * targetQuantity;

    let updatedItem: CartItem;

    if (existingIndex !== -1) {
      updatedItem = {
        ...cart.items[existingIndex],
        quantity: targetQuantity,
        lineTotal,
        unitPrice,
        availableStock: product.stock,
      };
      cart.items[existingIndex] = updatedItem;
    } else {
      updatedItem = {
        id: 'cartitem-' + uuid(),
        productId,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url || '',
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
        inStock: product.stock > 0,
        availableStock: product.stock,
      };
      cart.items.push(updatedItem);
    }

    const updatedCart = recalculateCart(cart.items);
    MockDatabase.setCart(updatedCart);

    return {
      success: true,
      data: updatedItem,
    };
  },

  async updateCartItem(itemId: string, quantity: number): Promise<ApiResponse<Cart>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const cart = MockDatabase.getCart();
    const itemIndex = cart.items.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cart item not found.' },
      };
    }

    const item = cart.items[itemIndex];
    const products = MockDatabase.getProducts();
    const product = products.find((p) => p.id === item.productId);

    if (!product || !product.isActive) {
      cart.items.splice(itemIndex, 1);
      const updatedCart = recalculateCart(cart.items);
      MockDatabase.setCart(updatedCart);
      return { success: true, data: updatedCart };
    }

    if (quantity > product.stock) {
      return {
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: `Only ${product.stock} items are available in stock.`,
        },
      };
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const unitPrice = product.salePrice !== null ? product.salePrice : product.price;
      cart.items[itemIndex] = {
        ...item,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        availableStock: product.stock,
      };
    }

    const updatedCart = recalculateCart(cart.items);
    MockDatabase.setCart(updatedCart);

    return {
      success: true,
      data: updatedCart,
    };
  },

  async deleteCartItem(itemId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay();

    if (MockDatabase.getErrorToggles().simulateServerErrors) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Simulated server error.' },
      };
    }

    const cart = MockDatabase.getCart();
    const filteredItems = cart.items.filter((item) => item.id !== itemId);
    const updatedCart = recalculateCart(filteredItems);
    MockDatabase.setCart(updatedCart);

    return {
      success: true,
      data: { deleted: true },
    };
  },
};
