import { adminSupabase } from '../lib/supabase/admin'
import { databaseError } from '../lib/databaseError'
import { trackBulk } from './shiprocket'
import { processTrackingResult } from '../modules/shiprocket/service'

export async function synchronizeActiveShipments(
  statuses = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivery_failed', 'rto'],
  source: 'cron_poll' | 'manual' = 'cron_poll'
) {
  let cursor: string | null = null
  let totalChecked = 0,
    totalUpdated = 0
  const failures: string[] = []
  while (true) {
    let query = adminSupabase
      .from('orders')
      .select('id,awb_code')
      .not('awb_code', 'is', null)
      .in('status', statuses)
      .order('id', { ascending: true })
      .limit(500)
    if (cursor) query = query.gt('id', cursor)
    const { data, error } = await query
    if (error)
      throw databaseError(
        'shipping.select_active_page',
        error,
        'Active shipments could not be loaded'
      )
    const page = data ?? []
    if (!page.length) break
    totalChecked += page.length
    for (let offset = 0; offset < page.length; offset += 50) {
      const batch = page.slice(offset, offset + 50)
      const result = await trackBulk(batch.map((row) => row.awb_code as string))
      for (const order of batch) {
        const tracking = result[order.awb_code as string]?.tracking_data
        if (!tracking) {
          failures.push(order.id as string)
          continue
        }
        try {
          const applied = await processTrackingResult(order.awb_code as string, tracking, source)
          if (applied.applied) totalUpdated++
        } catch {
          failures.push(order.id as string)
        }
      }
    }
    cursor = page.at(-1)!.id as string
  }
  if (failures.length)
    throw new Error(
      `Tracking synchronization failed for ${failures.length} shipments; inspect provider payload identities and timestamps`
    )
  return { totalChecked, totalUpdated }
}
