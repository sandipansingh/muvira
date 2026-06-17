import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { Profile } from '../../types'
import type { UpdateProfileInput } from './schema'

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, phone, role, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found')
  return data as Profile
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
  // SECURITY: Only allow updating full_name and phone.
  // The role field must NEVER be updated via this endpoint - it's not in the schema
  // (which uses .strict()), but we also explicitly pick safe fields here as defense-in-depth.
  const safeUpdate: Partial<Pick<Profile, 'full_name' | 'phone'>> = {}
  if (input.full_name !== undefined) safeUpdate.full_name = input.full_name
  if (input.phone !== undefined) safeUpdate.phone = input.phone

  const { data, error } = await adminSupabase
    .from('profiles')
    .update(safeUpdate)
    .eq('id', userId) // ownership enforced here - always use userId from JWT
    .select('id, email, full_name, phone, role, created_at, updated_at')
    .single()

  if (error || !data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found')
  return data as Profile
}
