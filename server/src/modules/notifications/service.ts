import { adminSupabase } from '../../lib/supabase/admin'
import type { UpdateNotificationPrefsInput } from './schema'

export interface NotificationPrefs {
  email_enabled: boolean
}

export async function getUserPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await adminSupabase
    .from('notification_preferences')
    .select('email_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  return data ?? { email_enabled: true }
}

export async function updateUserPrefs(
  userId: string,
  input: UpdateNotificationPrefsInput
): Promise<NotificationPrefs> {
  const { data } = await adminSupabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
    .select('email_enabled')
    .single()

  return data ?? { email_enabled: true }
}

export async function adminListNotificationLogs(params: {
  page: number
  limit: number
  orderId?: string
}): Promise<{
  logs: Array<{
    id: string
    order_id: string
    user_id: string
    notification_type: string
    event_type: string
    sent_status: string
    created_at: string
  }>
  total: number
}> {
  const offset = (params.page - 1) * params.limit

  let query = adminSupabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (params.orderId) {
    query = query.eq('order_id', params.orderId)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    logs: (data ?? []) as Array<{
      id: string
      order_id: string
      user_id: string
      notification_type: string
      event_type: string
      sent_status: string
      created_at: string
    }>,
    total: count ?? 0,
  }
}
