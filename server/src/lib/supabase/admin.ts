/**
 * Service-role Supabase client — bypasses Row-Level Security.
 *
 * SECURITY: Use this ONLY in:
 *   - Admin routes (behind requireAdmin middleware)
 *   - Webhook handlers (behind signature verification)
 *   - Internal utility functions that are NOT reachable from user input
 *     without an ownership/authorization check wrapping the call.
 *
 * Never expose this client instance or the service-role key to any code
 * path reachable by unauthenticated or unprivileged requests.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

// Singleton — module is loaded once at server startup
export const adminSupabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
