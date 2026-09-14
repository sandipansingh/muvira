import { MAX_CART_ITEM_QTY } from '../constants/cart.constants'
import type { CartItem } from '../types/cart'
import type { ProductDetail, ProductListItem } from '../types/product'

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

export function addGuestCartItem(
  items: CartItem[],
  product: ProductDetail | ProductListItem,
  requestedQuantity: number
) {
  const quantity = Math.min(Math.max(1, requestedQuantity), MAX_CART_ITEM_QTY)
  const existing = items.find((item) => item.productId === product.id)
  const nextQuantity = (existing?.quantity ?? 0) + quantity

  if (!product.inStock || nextQuantity > product.stock) {
    return {
      items,
      error: `Only ${Math.max(0, product.stock)} units available`,
    }
  }

  if (!existing) {
    return {
      items: [...items, buildGuestItem(product, quantity)],
      error: null,
    }
  }

  return {
    items: items.map((item) =>
      item.productId === product.id
        ? {
            ...item,
            quantity: nextQuantity,
            lineTotal: item.unitPrice * nextQuantity,
          }
        : item
    ),
    error: null,
  }
}
