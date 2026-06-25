import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Coupon } from '../../types'
import type { CreateCouponInput, UpdateCouponInput } from './schema'

export async function validateCoupon(
  code: string,
  subtotalPaisa: number
): Promise<{ coupon: Coupon; discountPaisa: number }> {
  const { data: coupon, error } = await adminSupabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !coupon) {
    throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon code not found')
  }

  if (!coupon.is_active) {
    throw new AppError(400, 'COUPON_INACTIVE', 'This coupon is no longer active')
  }

  const now = new Date()

  if (new Date(coupon.valid_from) > now) {
    throw new AppError(400, 'COUPON_NOT_YET_VALID', 'This coupon is not yet active')
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    throw new AppError(400, 'COUPON_EXPIRED', 'This coupon has expired')
  }

  if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
    throw new AppError(400, 'COUPON_EXHAUSTED', 'This coupon has reached its usage limit')
  }

  if (subtotalPaisa < coupon.min_order_amount_paisa) {
    const minRupees = (coupon.min_order_amount_paisa / 100).toFixed(2)
    throw new AppError(
      400,
      'COUPON_MIN_ORDER',
      `Minimum order of ₹${minRupees} required for this coupon`
    )
  }

  // Calculate discount amount (integer paisa)
  let discountPaisa: number

  if (coupon.discount_type === 'percentage') {
    discountPaisa = Math.round((subtotalPaisa * coupon.discount_value) / 100)
    // Apply cap if specified (0 or null means no cap)
    if (coupon.max_discount_paisa != null && coupon.max_discount_paisa > 0) {
      discountPaisa = Math.min(discountPaisa, coupon.max_discount_paisa)
    }
  } else {
    // Fixed discount — cannot exceed the subtotal
    discountPaisa = Math.min(coupon.discount_value, subtotalPaisa)
  }

  return { coupon: coupon as Coupon, discountPaisa }
}

// Admin CRUD

export async function adminListCoupons(): Promise<Coupon[]> {
  const { data, error } = await adminSupabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch coupons')
  return (data as Coupon[]) ?? []
}

export async function adminListCouponsPaginated(
  page: number,
  limit: number
): Promise<{ data: Coupon[]; total: number; page: number; limit: number; totalPages: number }> {
  const offset = (page - 1) * limit

  const { data, error, count } = await adminSupabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch coupons')
  return {
    data: (data as Coupon[]) ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const { data, error } = await adminSupabase
    .from('coupons')
    .insert({ ...input, code: input.code.toUpperCase() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505')
      throw new AppError(409, 'DUPLICATE_CODE', 'Coupon code already exists')
    throw new AppError(500, 'DB_ERROR', 'Failed to create coupon')
  }
  return data as Coupon
}

export async function updateCoupon(id: string, input: UpdateCouponInput): Promise<Coupon> {
  const update = input.code ? { ...input, code: input.code.toUpperCase() } : input

  const { data, error } = await adminSupabase
    .from('coupons')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found')
  return data as Coupon
}

export async function deactivateCoupon(id: string): Promise<Coupon> {
  const { data, error } = await adminSupabase
    .from('coupons')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new AppError(404, 'COUPON_NOT_FOUND', 'Coupon not found')
  return data as Coupon
}
