import { adminSupabase } from '../../lib/supabase/admin';
import { AppError } from '../../types';
import type { Address } from '../../types';
import type { CreateAddressInput, UpdateAddressInput } from './schema';

export async function listAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await adminSupabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch addresses');
  return (data as Address[]) ?? [];
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput,
): Promise<Address> {
  // If new address is default, unset existing default first (atomically)
  if (input.is_default) {
    await adminSupabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await adminSupabase
    .from('addresses')
    // SECURITY: user_id is always set from the JWT userId — never from input
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to create address');
  return data as Address;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<Address> {
  // Layer 2 ownership check — verify this address belongs to the requesting user
  const { data: existing } = await adminSupabase
    .from('addresses')
    .select('user_id')
    .eq('id', addressId)
    .single();

  // Return 404 regardless of whether address exists or belongs to another user
  // (do not reveal that another user's address ID exists)
  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }

  if (input.is_default) {
    await adminSupabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await adminSupabase
    .from('addresses')
    .update(input)
    .eq('id', addressId)
    .eq('user_id', userId) // double-enforce ownership at DB query level too
    .select()
    .single();

  if (error || !data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return data as Address;
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('addresses')
    .select('user_id')
    .eq('id', addressId)
    .single();

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }

  const { error } = await adminSupabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to delete address');
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<Address> {
  // Layer 2 ownership check
  const { data: existing } = await adminSupabase
    .from('addresses')
    .select('user_id')
    .eq('id', addressId)
    .single();

  if (!existing || existing.user_id !== userId) {
    throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  }

  // Unset current default
  await adminSupabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);

  // Set new default
  const { data, error } = await adminSupabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw new AppError(500, 'DB_ERROR', 'Failed to set default address');
  return data as Address;
}
