import {
  createClient,
  type SupabaseClient,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from '../../config/env'

// Singleton - module is loaded once at server startup
export const adminSupabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: WebSocket as unknown as WebSocketLikeConstructor,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
