import { Resend } from 'resend'
import { env } from '../config/env'
import { logger } from '../lib/logger'
import { adminSupabase } from '../lib/supabase/admin'
import { getUserPrefs } from '../modules/notifications/service'
import type {
  NotificationDelivery,
  NotificationEventType,
  NotificationOrderSnapshot,
  NotificationOutboxEvent,
  NotificationQueueResult,
} from '../types'

const EVENT_CONTENT: Record<NotificationEventType, { subject: string; message: string }> = {
  'order.payment_captured': {
    subject: 'Order confirmed',
    message: 'Your payment was verified and your order is confirmed.',
  },
  'order.payment_failed': {
    subject: 'Payment not completed',
    message: 'Your payment was not completed and the checkout was cancelled.',
  },
  'order.shipped': {
    subject: 'Order shipped',
    message: 'Your order has shipped.',
  },
  'order.out_for_delivery': {
    subject: 'Out for delivery',
    message: 'Your order is out for delivery.',
  },
  'order.delivered': {
    subject: 'Order delivered',
    message: 'Your order was marked as delivered.',
  },
  'order.cancelled': {
    subject: 'Order cancelled',
    message: 'Your order was cancelled.',
  },
  'order.rto': {
    subject: 'Order returning to sender',
    message: 'The carrier is returning your order to the sender.',
  },
  'order.returned': {
    subject: 'Order returned',
    message: 'Your order was marked as returned.',
  },
  'order.refunded': {
    subject: 'Order refunded',
    message: 'Your order was marked as refunded.',
  },
  'order.delivery_failed': {
    subject: 'Delivery attempt failed',
    message: 'The carrier reported an unsuccessful delivery attempt.',
  },
  'order.lost': {
    subject: 'Shipment exception',
    message: 'The carrier reported that your shipment was lost. Our team will review it.',
  },
  'order.damaged': {
    subject: 'Shipment exception',
    message: 'The carrier reported that your shipment was damaged. Our team will review it.',
  },
}

let resend: Resend | null = null

function emailClient(): Resend {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')
  resend ??= new Resend(env.RESEND_API_KEY)
  return resend
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatRupees(paisa: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paisa / 100)
}

function renderEmail(
  eventType: NotificationEventType,
  order: NotificationOrderSnapshot
): { subject: string; html: string } {
  const content = EVENT_CONTENT[eventType]
  const orderNumber = escapeHtml(order.order_number)
  const customerName = escapeHtml(order.shipping_full_name)
  const city = escapeHtml(order.shipping_city)
  const tracking = order.awb_code
    ? `<p><strong>AWB:</strong> ${escapeHtml(order.awb_code)}${
        order.courier_name ? ` via ${escapeHtml(order.courier_name)}` : ''
      }</p>`
    : ''
  const total =
    eventType === 'order.payment_captured'
      ? `<p><strong>Total:</strong> ${escapeHtml(formatRupees(order.total_amount_paisa))}</p>`
      : ''

  return {
    subject: `${content.subject} — ${orderNumber}`,
    html: `<main>
      <h1>${escapeHtml(env.STORE_NAME)}</h1>
      <p>Hello ${customerName},</p>
      <p>${escapeHtml(content.message)}</p>
      <p><strong>Order:</strong> ${orderNumber}</p>
      <p><strong>Destination:</strong> ${city}</p>
      ${total}
      ${tracking}
      <p>This is an automated email from ${escapeHtml(env.STORE_NAME)}.</p>
    </main>`,
  }
}

async function loadOrder(orderId: string): Promise<NotificationOrderSnapshot> {
  const { data, error } = await adminSupabase
    .from('orders')
    .select(
      'id, user_id, order_number, contact_email, shipping_full_name, shipping_city, total_amount_paisa, awb_code, courier_name'
    )
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(`Notification order could not be loaded: ${error?.message ?? orderId}`)
  }
  if (!data.contact_email) throw new Error(`Order ${orderId} has no immutable contact email`)
  return data as NotificationOrderSnapshot
}

async function completeOutbox(eventId: string): Promise<void> {
  const { data, error } = await adminSupabase.rpc('complete_notification_outbox', {
    p_outbox_event_id: eventId,
  })
  if (error || data !== true) throw new Error(error?.message ?? 'Outbox completion was rejected')
}

async function failOutbox(eventId: string, reason: unknown): Promise<void> {
  const message = reason instanceof Error ? reason.message : String(reason)
  const { error } = await adminSupabase.rpc('fail_notification_outbox', {
    p_outbox_event_id: eventId,
    p_error: message,
  })
  if (error) logger.error({ error, eventId }, 'Notification outbox failure could not be recorded')
}

async function materializeOutboxEvent(event: NotificationOutboxEvent): Promise<void> {
  const order = await loadOrder(event.aggregate_id)
  const payloadOrderId = event.payload['order_id']
  const payloadUserId = event.payload['user_id']
  if (payloadOrderId && payloadOrderId !== order.id) throw new Error('Outbox order ID mismatch')
  if (payloadUserId && payloadUserId !== order.user_id) throw new Error('Outbox user ID mismatch')

  const { error } = await adminSupabase.from('notification_deliveries').insert({
    outbox_event_id: event.id,
    order_id: order.id,
    user_id: order.user_id,
    event_type: event.event_type,
    channel: 'email',
  })

  if (error && error.code !== '23505') throw new Error(error.message)
  await completeOutbox(event.id)
}

async function processOutbox(batchSize: number): Promise<number> {
  const { data, error } = await adminSupabase.rpc('claim_notification_outbox', {
    p_limit: batchSize,
  })
  if (error) throw new Error(`Notification outbox claim failed: ${error.message}`)

  const events = (data ?? []) as NotificationOutboxEvent[]
  for (const event of events) {
    try {
      await materializeOutboxEvent(event)
    } catch (reason) {
      await failOutbox(event.id, reason)
    }
  }
  return events.length
}

async function markDeliverySkipped(deliveryId: string, reason: string): Promise<void> {
  const { data, error } = await adminSupabase.rpc('skip_notification_delivery', {
    p_delivery_id: deliveryId,
    p_reason: reason,
  })
  if (error || data !== true) throw new Error(error?.message ?? 'Delivery skip was rejected')
}

async function markDeliveryFailed(deliveryId: string, reason: unknown): Promise<void> {
  const message = reason instanceof Error ? reason.message : String(reason)
  const { error } = await adminSupabase.rpc('fail_notification_delivery', {
    p_delivery_id: deliveryId,
    p_error: message,
  })
  if (error) logger.error({ error, deliveryId }, 'Notification failure could not be recorded')
}

async function sendDelivery(delivery: NotificationDelivery): Promise<boolean> {
  const order = await loadOrder(delivery.order_id)
  if (order.user_id !== delivery.user_id) throw new Error('Notification delivery owner mismatch')

  const preferences = await getUserPrefs(delivery.user_id)
  if (!preferences.email_enabled) {
    await markDeliverySkipped(delivery.id, 'Customer disabled email notifications')
    return false
  }

  const message = renderEmail(delivery.event_type, order)
  const result = await emailClient().emails.send({
    from: `${env.STORE_NAME} <${env.EMAIL_FROM}>`,
    to: order.contact_email,
    subject: message.subject,
    html: message.html,
  })

  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message ?? 'Resend did not return a message ID')
  }

  const { data, error } = await adminSupabase.rpc('complete_notification_delivery', {
    p_delivery_id: delivery.id,
    p_provider_message_id: result.data.id,
  })
  if (error || data !== true) {
    throw new Error(error?.message ?? 'Delivery completion was rejected')
  }
  return true
}

async function processDeliveries(batchSize: number): Promise<{ processed: number; sent: number }> {
  const { data, error } = await adminSupabase.rpc('claim_notification_deliveries', {
    p_limit: batchSize,
  })
  if (error) throw new Error(`Notification delivery claim failed: ${error.message}`)

  const deliveries = (data ?? []) as NotificationDelivery[]
  let sent = 0
  for (const delivery of deliveries) {
    try {
      if (await sendDelivery(delivery)) sent += 1
    } catch (reason) {
      await markDeliveryFailed(delivery.id, reason)
    }
  }
  return { processed: deliveries.length, sent }
}

export async function processNotificationQueue(batchSize = 20): Promise<NotificationQueueResult> {
  const outboxProcessed = await processOutbox(batchSize)
  const deliveries = await processDeliveries(batchSize)
  const result = {
    outboxProcessed,
    deliveriesProcessed: deliveries.processed,
    sent: deliveries.sent,
    failed: deliveries.processed - deliveries.sent,
  }

  if (outboxProcessed > 0 || deliveries.processed > 0) {
    logger.info(result, 'Notification queue processed')
  }
  return result
}
