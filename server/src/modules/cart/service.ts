import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { CartItem } from '../../types'
import type { AddToCartInput, UpdateCartItemInput } from './schema'

interface CartItemWithProduct extends CartItem {
  products: {
    id: string
    name: string
    slug: string
    price_paisa: number
    compare_at_price_paisa: number | null
    stock: number
    is_active: boolean
    product_images: Array<{ id: string; url: string; is_primary: boolean }>
  }
}

export async function getCart(userId: string): Promise<CartItemWithProduct[]> {
  const { data, error } = await adminSupabase
    .from('cart_items')
    .select(
      `
      id, user_id, product_id, quantity, created_at, updated_at,
      products (
        id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary )
      )
    `
    )
    .eq('user_id', userId)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch cart')
  return (data as unknown as CartItemWithProduct[]) ?? []
}

export async function addToCart(
  userId: string,
  input: AddToCartInput
): Promise<CartItemWithProduct> {
  const { data: cartItemId, error } = await adminSupabase.rpc('add_cart_item_checked', {
    p_user_id: userId,
    p_product_id: input.product_id,
    p_quantity: input.quantity,
  })

  if (error || !cartItemId) {
    const message = error?.message ?? 'Failed to add to cart'
    if (message.includes('Product not found')) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
    }
    if (message.includes('units available')) {
      throw new AppError(400, 'INSUFFICIENT_STOCK', message)
    }
    if (message.includes('Maximum 100')) {
      throw new AppError(400, 'CART_LIMIT', 'Maximum 100 units per item')
    }
    throw new AppError(500, 'DB_ERROR', 'Failed to add to cart')
  }

  // Return full cart item with product details
  const { data, error: fetchError } = await adminSupabase
    .from('cart_items')
    .select(
      `
      id, user_id, product_id, quantity, created_at, updated_at,
      products ( id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary ) )
    `
    )
    .eq('id', cartItemId)
    .single()

  if (fetchError || !data) throw new AppError(500, 'DB_ERROR', 'Failed to fetch cart item')
  return data as unknown as CartItemWithProduct
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
): Promise<CartItemWithProduct> {
  const { error } = await adminSupabase.rpc('set_cart_item_quantity_checked', {
    p_user_id: userId,
    p_cart_item_id: itemId,
    p_quantity: input.quantity,
  })

  if (error) {
    if (error.message.includes('Cart item not found')) {
      throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found')
    }
    if (error.message.includes('Product not found')) {
      throw new AppError(400, 'PRODUCT_UNAVAILABLE', 'Product is no longer available')
    }
    if (error.message.includes('units available')) {
      throw new AppError(400, 'INSUFFICIENT_STOCK', error.message)
    }
    throw new AppError(500, 'DB_ERROR', 'Failed to update cart item')
  }

  const { data, error: fetchError } = await adminSupabase
    .from('cart_items')
    .select(
      `
      id, user_id, product_id, quantity, created_at, updated_at,
      products ( id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary ) )
    `
    )
    .eq('id', itemId)
    .single()

  if (fetchError || !data) throw new AppError(500, 'DB_ERROR', 'Failed to fetch updated cart item')
  return data as unknown as CartItemWithProduct
}

export async function removeFromCart(userId: string, itemId: string): Promise<void> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('cart_items')
    .select('user_id')
    .eq('id', itemId)
    .single()

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found')
  }

  const { error } = await adminSupabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to remove cart item')
}

export async function clearCart(userId: string): Promise<void> {
  const { error } = await adminSupabase.from('cart_items').delete().eq('user_id', userId)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to clear cart')
}
