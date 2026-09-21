import {
  createClient,
  type SupabaseClient,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from '../../config/env'

export function createUserSupabaseClient(userToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    realtime: {
      transport: WebSocket as unknown as WebSocketLikeConstructor,
    },
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
