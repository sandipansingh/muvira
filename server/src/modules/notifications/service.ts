import { adminSupabase } from '../../lib/supabase/admin'
import { AppError } from '../../types'
import type { UpdateNotificationPrefsInput } from './schema'

export interface NotificationPrefs {
  email_enabled: boolean
}

export async function getUserPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await adminSupabase
    .from('notification_preferences')
    .select('email_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new AppError(500, 'DB_ERROR', 'Failed to fetch notification preferences')
  return data ?? { email_enabled: true }
}

export async function updateUserPrefs(
  userId: string,
  input: UpdateNotificationPrefsInput
): Promise<NotificationPrefs> {
  const { data, error } = await adminSupabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
    .select('email_enabled')
    .single()

  if (error || !data) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update notification preferences')
  }
  return data
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
    .from('notification_deliveries')
    .select('id, order_id, user_id, channel, event_type, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + params.limit - 1)

  if (params.orderId) {
    query = query.eq('order_id', params.orderId)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    logs: (data ?? []).map((delivery) => ({
      id: delivery.id,
      order_id: delivery.order_id,
      user_id: delivery.user_id,
      notification_type: delivery.channel,
      event_type: delivery.event_type,
      sent_status: delivery.status,
      created_at: delivery.created_at,
    })),
    total: count ?? 0,
  }
}
