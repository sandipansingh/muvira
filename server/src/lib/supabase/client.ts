import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../../config/env'

export function createUserSupabaseClient(userToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    auth: {
      // We manage session externally via JWT; disable auto-refresh and persistence
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
