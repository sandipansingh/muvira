import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Address } from '../../types'
import type { CreateAddressInput, UpdateAddressInput } from './schema'

export async function listAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await adminSupabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch addresses')
  return (data as Address[]) ?? []
}

export async function createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
  const shouldBeDefault = input.is_default === true

  const { data, error } = await adminSupabase
    .from('addresses')
    .insert({ ...input, is_default: false, user_id: userId })
    .select()
    .single()

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to create address')
  if (shouldBeDefault) return setDefaultAddress(userId, data.id as string)
  return data as Address
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput
): Promise<Address> {
  // Layer 2 ownership check - verify this address belongs to the requesting user
  const { data: existing } = await adminSupabase
    .from('addresses')
    .select('user_id')
    .eq('id', addressId)
    .single()

  // Return 404 regardless of whether address exists or belongs to another user
  // (do not reveal that another user's address ID exists)
  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found')
  }

  const { is_default: shouldBeDefault, ...addressFields } = input

  const { data, error } = await adminSupabase
    .from('addresses')
    .update(addressFields)
    .eq('id', addressId)
    .eq('user_id', userId) // double-enforce ownership at DB query level too
    .select()
    .single()

  if (error || !data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found')
  if (shouldBeDefault) return setDefaultAddress(userId, addressId)
  return data as Address
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('addresses')
    .select('user_id')
    .eq('id', addressId)
    .single()

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found')
  }

  const { error } = await adminSupabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId)

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to delete address')
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<Address> {
  const { data, error } = await adminSupabase.rpc('set_default_address', {
    p_user_id: userId,
    p_address_id: addressId,
  })

  if (error || !data) {
    if (error?.message.includes('Address not found')) {
      throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found')
    }
    throw new AppError(500, 'DB_ERROR', 'Failed to set default address')
  }
  return data as Address
}
