/**
 * Creates a user-scoped Supabase client that carries the user's JWT.
 * RLS is ACTIVE on this client — the database will enforce row-level
 * policies so only the authenticated user's rows are visible/mutable.
 *
 * Use this client for ALL end-user database operations (not admin routes,
 * not webhooks — those use the admin client in admin.ts).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

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
  });
}
