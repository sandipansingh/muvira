import { adminSupabase } from '../../lib/supabase/admin';
import { AppError } from '../../types';
import type { CartItem } from '../../types';
import type { AddToCartInput, UpdateCartItemInput } from './schema';

interface CartItemWithProduct extends CartItem {
  products: {
    id: string;
    name: string;
    slug: string;
    price_paisa: number;
    compare_at_price_paisa: number | null;
    stock: number;
    is_active: boolean;
    product_images: Array<{ id: string; url: string; is_primary: boolean }>;
  };
}

export async function getCart(userId: string): Promise<CartItemWithProduct[]> {
  const { data, error } = await adminSupabase
    .from('cart_items')
    .select(`
      id, user_id, product_id, quantity, created_at, updated_at,
      products (
        id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary )
      )
    `)
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch cart');
  return (data as unknown as CartItemWithProduct[]) ?? [];
}

export async function addToCart(userId: string, input: AddToCartInput): Promise<CartItemWithProduct> {
  // Validate product exists and is active
  const { data: product } = await adminSupabase
    .from('products')
    .select('id, stock, is_active')
    .eq('id', input.product_id)
    .single();

  if (!product || !product.is_active) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  }

  if (product.stock < input.quantity) {
    throw new AppError(400, 'INSUFFICIENT_STOCK', `Only ${product.stock} units available`);
  }

  // Upsert: if item already in cart, increment quantity
  const { data: existing } = await adminSupabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', input.product_id)
    .single();

  let cartItemId: string;

  if (existing) {
    const newQty = existing.quantity + input.quantity;
    if (newQty > 100) throw new AppError(400, 'CART_LIMIT', 'Maximum 100 units per item');

    const { error } = await adminSupabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', existing.id)
      .eq('user_id', userId); // ownership enforced

    if (error) throw new AppError(500, 'DB_ERROR', 'Failed to update cart');
    cartItemId = existing.id;
  } else {
    const { data: newItem, error } = await adminSupabase
      .from('cart_items')
      // SECURITY: user_id always from JWT, never from input
      .insert({ user_id: userId, product_id: input.product_id, quantity: input.quantity })
      .select('id')
      .single();

    if (error || !newItem) throw new AppError(500, 'DB_ERROR', 'Failed to add to cart');
    cartItemId = newItem.id;
  }

  // Return full cart item with product details
  const { data, error: fetchError } = await adminSupabase
    .from('cart_items')
    .select(`
      id, user_id, product_id, quantity, created_at, updated_at,
      products ( id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary ) )
    `)
    .eq('id', cartItemId)
    .single();

  if (fetchError || !data) throw new AppError(500, 'DB_ERROR', 'Failed to fetch cart item');
  return data as unknown as CartItemWithProduct;
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput,
): Promise<CartItemWithProduct> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('cart_items')
    .select('user_id, product_id')
    .eq('id', itemId)
    .single();

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
  }

  // Validate stock
  const { data: product } = await adminSupabase
    .from('products')
    .select('stock')
    .eq('id', existing.product_id)
    .single();

  if (!product || product.stock < input.quantity) {
    throw new AppError(400, 'INSUFFICIENT_STOCK', `Only ${product?.stock ?? 0} units available`);
  }

  const { error } = await adminSupabase
    .from('cart_items')
    .update({ quantity: input.quantity })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to update cart item');

  const { data, error: fetchError } = await adminSupabase
    .from('cart_items')
    .select(`
      id, user_id, product_id, quantity, created_at, updated_at,
      products ( id, name, slug, price_paisa, compare_at_price_paisa, stock, is_active,
        product_images ( id, url, is_primary ) )
    `)
    .eq('id', itemId)
    .single();

  if (fetchError || !data) throw new AppError(500, 'DB_ERROR', 'Failed to fetch updated cart item');
  return data as unknown as CartItemWithProduct;
}

export async function removeFromCart(userId: string, itemId: string): Promise<void> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('cart_items')
    .select('user_id')
    .eq('id', itemId)
    .single();

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
  }

  const { error } = await adminSupabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to remove cart item');
}

export async function clearCart(userId: string): Promise<void> {
  const { error } = await adminSupabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to clear cart');
}
