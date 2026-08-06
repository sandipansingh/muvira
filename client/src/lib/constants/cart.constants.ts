import type { Cart } from '../types/cart'

/**
 * Maximum allowed units per cart item.
 */
export const MAX_CART_ITEM_QTY = 100

/**
 * Empty cart default structure.
 */
export const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  itemCount: 0,
}
