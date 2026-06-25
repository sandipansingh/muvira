import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../../config/env'

// Singleton — module is loaded once at server startup
export const adminSupabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
