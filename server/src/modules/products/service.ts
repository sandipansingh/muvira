import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Product, ProductImage, PublicProductDto } from '../../types'
import type {
  ListProductsQuery,
  CreateProductInput,
  UpdateProductInput,
  AddProductImageInput,
} from './schema'
import { getReviewAggregates } from '../reviews/service'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PUBLIC_PRODUCT_SELECT = `
  id, name, slug, description, short_description, category_id, price_paisa,
  compare_at_price_paisa, sku, stock, weight_grams, is_active, is_featured,
  tags, meta_title, meta_description, metadata, created_at, updated_at,
  product_images ( id, url, alt_text, sort_order, is_primary ),
  categories ( id, name, slug )
`

function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function attachReviewAggregates(
  products: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (products.length === 0) return products

  const ids = products.map((product) => product['id'] as string)
  const aggregates = await getReviewAggregates(ids)
  for (const product of products) {
    const aggregate = aggregates[product['id'] as string]
    product['rating'] = aggregate?.rating ?? null
    product['review_count'] = aggregate?.reviewCount ?? 0
  }
  return products
}

async function resolveCategoryToId(
  category: string | undefined,
  requireActive = true
): Promise<string | undefined> {
  if (!category) return undefined
  if (UUID_REGEX.test(category)) return category

  // treat as slug
  let q = adminSupabase.from('categories').select('id').eq('slug', category)

  if (requireActive) q = q.eq('is_active', true)

  const { data } = await q.single()
  return data?.id ?? undefined
}

// Public: list products

export async function listProducts(query: ListProductsQuery): Promise<{
  products: PublicProductDto[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { page, limit, category, min_price_paisa, max_price_paisa, inStock, sort, q } = query

  const offset = (page - 1) * limit

  const categoryId = await resolveCategoryToId(category, true)

  let dbQuery = adminSupabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT, { count: 'exact' })
    .eq('is_active', true)

  if (category) {
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId)
    } else {
      // explicit category filter provided but not found (bad slug) → no results
      dbQuery = dbQuery.eq('category_id', '00000000-0000-0000-0000-000000000000')
    }
  }
  if (min_price_paisa !== undefined) dbQuery = dbQuery.gte('price_paisa', min_price_paisa)
  if (max_price_paisa !== undefined) dbQuery = dbQuery.lte('price_paisa', max_price_paisa)
  if (inStock === 'true') dbQuery = dbQuery.gt('stock', 0)

  if (q) {
    const searchTerm = normalizeSearchTerm(q)
    if (searchTerm) {
      dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    } else {
      dbQuery = dbQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      dbQuery = dbQuery.order('price_paisa', { ascending: true })
      break
    case 'price_desc':
      dbQuery = dbQuery.order('price_paisa', { ascending: false })
      break
    case 'newest':
      dbQuery = dbQuery.order('created_at', { ascending: false })
      break
    case 'featured':
      dbQuery = dbQuery
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      break
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch products')

  const products = (await attachReviewAggregates(
    (data ?? []) as Record<string, unknown>[]
  )) as unknown as PublicProductDto[]

  return {
    products,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// Admin: list all products (including inactive) with pagination
export async function adminListProducts(query: ListProductsQuery) {
  const { page, limit, category, min_price_paisa, max_price_paisa, inStock, sort, q } = query

  const offset = (page - 1) * limit

  const categoryId = await resolveCategoryToId(category, false)

  let dbQuery = adminSupabase.from('products').select(
    `
      id, name, slug, short_description, description, category_id, price_paisa,
      compare_at_price_paisa, sku, stock, is_active, is_featured,
      tags, metadata, created_at,
      product_images ( id, url, alt_text, sort_order, is_primary ),
      categories ( id, name, slug )
    `,
    { count: 'exact' }
  )
  // Intentionally do NOT filter is_active - admins see everything

  if (category) {
    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId)
    } else {
      dbQuery = dbQuery.eq('category_id', '00000000-0000-0000-0000-000000000000')
    }
  }
  if (min_price_paisa !== undefined) dbQuery = dbQuery.gte('price_paisa', min_price_paisa)
  if (max_price_paisa !== undefined) dbQuery = dbQuery.lte('price_paisa', max_price_paisa)
  if (inStock === 'true') dbQuery = dbQuery.gt('stock', 0)

  if (q) {
    const searchTerm = normalizeSearchTerm(q)
    if (searchTerm) {
      dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    } else {
      dbQuery = dbQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      dbQuery = dbQuery.order('price_paisa', { ascending: true })
      break
    case 'price_desc':
      dbQuery = dbQuery.order('price_paisa', { ascending: false })
      break
    case 'newest':
      dbQuery = dbQuery.order('created_at', { ascending: false })
      break
    case 'featured':
      dbQuery = dbQuery
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      break
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1)

  const { data, error, count } = await dbQuery

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch products')

  const products = await attachReviewAggregates((data ?? []) as Record<string, unknown>[])

  return {
    products,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// Public: get single product by slug

export async function getProductBySlug(slug: string): Promise<PublicProductDto> {
  const { data, error } = await adminSupabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  const [product] = await attachReviewAggregates([data as Record<string, unknown>])
  return product as unknown as PublicProductDto
}

// Public: related products

export async function getRelatedProducts(productId: string): Promise<PublicProductDto[]> {
  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('category_id')
    .eq('id', productId)
    .eq('is_active', true)
    .single()

  if (productError || !product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')

  const { data, error } = await adminSupabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', productId)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch related products')

  const products = await attachReviewAggregates((data ?? []) as Record<string, unknown>[])
  return products as unknown as PublicProductDto[]
}

// Admin: create product

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data, error } = await adminSupabase.from('products').insert(input).select().single()

  if (error) {
    if (error.code === '23505') {
      throw new AppError(409, 'DUPLICATE_SLUG', 'A product with this slug or SKU already exists')
    }
    throw new AppError(500, 'DB_ERROR', 'Failed to create product')
  }

  return data as Product
}

// Admin: update product

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const { data, error } = await adminSupabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  return data as Product
}

// Admin: delete (soft) product

export async function deleteProduct(id: string): Promise<void> {
  const { data, error } = await adminSupabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
}

// Admin: add product image

export async function addProductImage(
  productId: string,
  input: AddProductImageInput
): Promise<ProductImage> {
  const { data, error } = await adminSupabase.rpc('add_product_image_atomic', {
    p_product_id: productId,
    p_url: input.url,
    p_alt_text: input.alt_text ?? null,
    p_sort_order: input.sort_order,
    p_is_primary: input.is_primary,
  })

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to add product image')

  return data as ProductImage
}

// Admin: delete product image

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  const { data, error } = await adminSupabase.rpc('delete_product_image_atomic', {
    p_product_id: productId,
    p_image_id: imageId,
  })

  if (error || data !== true) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Product image not found')
}

export async function getProductById(id: string): Promise<Record<string, unknown>> {
  const { data, error } = await adminSupabase
    .from('products')
    .select(
      `
      *,
      product_images ( id, url, alt_text, sort_order, is_primary ),
      categories ( id, name, slug )
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  const prod = data as Record<string, unknown>
  const aggregates = await getReviewAggregates([prod.id as string])
  const agg = aggregates[prod.id as string]
  if (agg) {
    prod.rating = agg.rating
    prod.review_count = agg.reviewCount
  }
  return prod
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<void> {
  const { error } = await adminSupabase.rpc('reorder_product_images_atomic', {
    p_product_id: productId,
    p_image_ids: imageIds,
  })
  if (error) throw new AppError(400, 'IMAGE_ORDER_INVALID', error.message)
}
