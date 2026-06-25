import { adminSupabase } from '../../../lib/supabase/admin'
import { AppError } from '../../../types'
import type { InventoryQuery, UpdateStockInput } from './schema'

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  stock: number
  price_paisa: number
  is_active: boolean
  category: { id: string; name: string } | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveCategoryToId(category: string | undefined): Promise<string | undefined> {
  if (!category) return undefined
  if (UUID_REGEX.test(category)) return category

  const { data } = await adminSupabase.from('categories').select('id').eq('slug', category).single()
  return data?.id ?? undefined
}

export async function getInventory(query: InventoryQuery): Promise<{
  items: InventoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit, low_stock_only, category } = query
  const offset = (page - 1) * limit

  const categoryId = await resolveCategoryToId(category)

  let dbQuery = adminSupabase
    .from('products')
    .select('id, name, sku, stock, price_paisa, is_active, categories ( id, name )', {
      count: 'exact',
    })
    .order('stock', { ascending: true })

  if (low_stock_only === 'true') dbQuery = dbQuery.lte('stock', 10)
  if (category) {
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId)
    } else {
      dbQuery = dbQuery.eq('category_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch inventory')

  return {
    items: (data as unknown as InventoryItem[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function updateProductStock(
  productId: string,
  input: UpdateStockInput
): Promise<{ id: string; name: string; stock: number }> {
  const { data, error } = await adminSupabase
    .from('products')
    .update({ stock: input.stock })
    .eq('id', productId)
    .select('id, name, stock')
    .single()

  if (error || !data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  return data as { id: string; name: string; stock: number }
}

export async function getLowStockList(): Promise<InventoryItem[]> {
  const { data, error } = await adminSupabase
    .from('products')
    .select('id, name, sku, stock, price_paisa, is_active, categories ( id, name )')
    .lte('stock', 10)
    .eq('is_active', true)
    .order('stock', { ascending: true })

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch low-stock items')
  return (data as unknown as InventoryItem[]) ?? []
}
