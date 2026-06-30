import { orderEvents, type OrderEventPayload } from './eventBus'
import { adminSupabase } from '../lib/supabase/admin'
import { logger } from '../lib/logger'
import { env } from '../config/env'

let resend: import('resend').Resend | null = null
let subscribersInitialized = false

export async function initNotificationSubscribers(): Promise<void> {
  if (subscribersInitialized) return
  subscribersInitialized = true

  if (env.RESEND_API_KEY) {
    const ResendModule = await import('resend')
    resend = new ResendModule.Resend(env.RESEND_API_KEY)
  }

  orderEvents.on('order:payment:captured', handleOrderConfirmed)
  orderEvents.on('order:shipped', handleShipped)
  orderEvents.on('order:out-for-delivery', handleOutForDelivery)
  orderEvents.on('order:delivered', handleDelivered)
  orderEvents.on('order:cancelled', handleCancelled)
  orderEvents.on('order:delivery-failed', handleDeliveryFailed)
  orderEvents.on('order:rto:initiated', handleRto)
  orderEvents.on('order:returned', handleReturned)

  logger.info('NotificationSubscriber: initialized')
}

// --- Core send helpers ---

async function getEmailForUser(userId: string): Promise<string | null> {
  if (!resend) return null
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()
  return profile?.email ?? null
}

async function canSendNotification(userId: string): Promise<boolean> {
  const { data: prefs } = await adminSupabase
    .from('notification_preferences')
    .select('email_enabled')
    .eq('user_id', userId)
    .maybeSingle()
  return prefs?.email_enabled !== false
}

async function isDuplicateNotification(
  orderId: string,
  eventType: string
): Promise<boolean> {
  const { data: existing } = await adminSupabase
    .from('notification_logs')
    .select('id')
    .eq('order_id', orderId)
    .eq('event_type', eventType)
    .eq('notification_type', 'email')
    .eq('sent_status', 'sent')
    .maybeSingle()
  return existing !== null
}

async function recordNotification(
  orderId: string,
  userId: string,
  eventType: string
): Promise<void> {
  await adminSupabase.from('notification_logs').insert({
    order_id: orderId,
    user_id: userId,
    notification_type: 'email',
    event_type: eventType,
    sent_status: 'sent',
  })
}

async function sendEmail(params: {
  orderId: string
  userId: string
  eventType: string
  subject: string
  html: string
}): Promise<void> {
  if (!resend) return
  try {
    const toEmail = await getEmailForUser(params.userId)
    if (!toEmail) {
      logger.warn({ orderId: params.orderId }, 'NotificationSubscriber: no email found')
      return
    }
    if (!(await canSendNotification(params.userId))) {
      logger.info({ orderId: params.orderId, eventType: params.eventType }, 'NotificationSubscriber: user disabled emails')
      return
    }
    if (await isDuplicateNotification(params.orderId, params.eventType)) {
      logger.info({ orderId: params.orderId, eventType: params.eventType }, 'NotificationSubscriber: duplicate skipped')
      return
    }

    await resend.emails.send({
      from: `${env.STORE_NAME} <${env.EMAIL_FROM}>`,
      to: toEmail,
      subject: params.subject,
      html: params.html,
    })
    await recordNotification(params.orderId, params.userId, params.eventType)
    logger.info({ orderId: params.orderId, eventType: params.eventType }, 'NotificationSubscriber: email sent')
  } catch (err) {
    logger.error({ err, orderId: params.orderId }, 'NotificationSubscriber: failed to send email')
  }
}

async function emailWrapper(
  html: string
): Promise<string> {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6">
      <div style="text-align:center;padding:24px;background:#fafafa;border-bottom:3px solid #c4a777">
        <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:2px;color:#2d2d2d">${env.STORE_NAME}</h1>
      </div>
      <div style="padding:32px 24px">${html}</div>
      <div style="padding:16px 24px;background:#fafafa;font-size:12px;color:#888;text-align:center">
        <p style="margin:0">This is an automated message from ${env.STORE_NAME}.</p>
        <p style="margin:4px 0 0">Manage notifications in your account settings.</p>
      </div>
    </div>`
}

async function fetchOrderInfo(orderId: string): Promise<{
  orderNumber: string
  totalAmountPaisa: number
  customerName: string
  shippingCity: string
  awbCode: string | null
  courierName: string | null
} | null> {
  try {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('order_number, total_amount_paisa, shipping_full_name, shipping_city, awb_code, courier_name')
      .eq('id', orderId)
      .single()
    if (!order) return null
    return {
      orderNumber: order.order_number,
      totalAmountPaisa: order.total_amount_paisa,
      customerName: order.shipping_full_name,
      shippingCity: order.shipping_city,
      awbCode: order.awb_code,
      courierName: order.courier_name,
    }
  } catch { return null }
}

function totalRupees(paisa: number): string {
  return (paisa / 100).toFixed(2)
}

function buildTrackingLine(awb: string | null, courier: string | null): string {
  if (!awb) return ''
  const courierText = courier ? ` via ${courier}` : ''
  return `<p style="font-size:13px;color:#636363;margin:8px 0">
    <strong>Tracking Number:</strong> ${awb}${courierText}<br>
    <a href="${env.ALLOWED_ORIGINS.split(',')[0]?.trim() ?? ''}/orders" style="color:#c4a777;text-decoration:underline">Track your order</a>
  </p>`
}

// --- Event Handlers ---

async function handleOrderConfirmed(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'order_confirmed',
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Thank you for your order, ${order.customerName}!</h2>
      <p style="margin:0 0 8px">Your order <strong>${order.orderNumber}</strong> has been confirmed.</p>
      <p style="margin:0 0 16px"><strong>Total: ₹${totalRupees(order.totalAmountPaisa)}</strong></p>
      <p style="margin:0 0 8px">We will notify you when your order ships.</p>
      <p style="margin:0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleShipped(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'shipped',
    subject: `Shipped — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Your order is on the way!</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> has been shipped to ${order.shippingCity}.</p>
      ${buildTrackingLine(order.awbCode, order.courierName)}
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleOutForDelivery(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'out_for_delivery',
    subject: `Out for Delivery — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Your order is arriving today!</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> is out for delivery to ${order.shippingCity}.</p>
      ${buildTrackingLine(order.awbCode, order.courierName)}
      <p style="margin:8px 0 0;font-size:14px;color:#e57318">Please ensure someone is available to receive the package.</p>
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleDelivered(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'delivered',
    subject: `Delivered — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Your order has been delivered!</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> has been delivered to ${order.shippingCity}.</p>
      <p style="margin:0 0 16px">We hope you love your purchase. Thank you for shopping with us!</p>
      <p style="margin:0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleCancelled(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'cancelled',
    subject: `Cancelled — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Your order has been cancelled</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> has been cancelled.</p>
      <p style="margin:0 0 8px">If you did not request this, please contact our support team immediately.</p>
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleDeliveryFailed(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  // Customer notification
  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'delivery_failed',
    subject: `Delivery Attempt Failed — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Delivery attempt was unsuccessful</h2>
      <p style="margin:0 0 8px">A delivery attempt for order <strong>${order.orderNumber}</strong> to ${order.shippingCity} was unsuccessful.</p>
      ${buildTrackingLine(order.awbCode, order.courierName)}
      <p style="margin:8px 0 0;font-size:14px;color:#c62828">The courier will attempt delivery again. Please ensure someone is available to receive the package.</p>
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })

  // Admin NDR alert (send to admin emails, fire-and-forget)
  sendAdminNDRAlert(payload, order).catch((err) => {
    logger.error({ err, orderId: payload.orderId }, 'Admin NDR alert failed')
  })
}

async function sendAdminNDRAlert(
  payload: OrderEventPayload,
  order: { orderNumber: string; shippingCity: string; awbCode: string | null }
): Promise<void> {
  if (!resend) return

  try {
    const { data: admins } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) return

    const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[]
    if (adminEmails.length === 0) return

    // Check dedup for admin NDR
    const eventType = 'admin_delivery_failed'
    const { data: existing } = await adminSupabase
      .from('notification_logs')
      .select('id')
      .eq('order_id', payload.orderId)
      .eq('event_type', eventType)
      .eq('notification_type', 'email')
      .eq('sent_status', 'sent')
      .maybeSingle()

    if (existing) return

    await resend.emails.send({
      from: `${env.STORE_NAME} Alerts <${env.EMAIL_FROM}>`,
      to: adminEmails,
      subject: `NDR: Delivery failed for ${order.orderNumber}`,
      html: await emailWrapper(`
        <h2 style="margin:0 0 16px;font-size:18px;color:#c62828">Delivery Failed — Action Required</h2>
        <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> to ${order.shippingCity} had a failed delivery attempt.</p>
        ${buildTrackingLine(order.awbCode, null)}
        <p style="margin:8px 0 0">Source: ${payload.source} | AWB: ${payload.awbCode ?? 'N/A'}</p>
      `),
    })

    // Record admin notification
    await adminSupabase.from('notification_logs').insert({
      order_id: payload.orderId,
      user_id: payload.userId,
      notification_type: 'email',
      event_type: eventType,
      sent_status: 'sent',
    })

    logger.info({ orderId: payload.orderId }, 'Admin NDR alert sent')
  } catch (err) {
    logger.error({ err }, 'Failed to send admin NDR alert')
  }
}

async function handleRto(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'rto_initiated',
    subject: `Return Initiated — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Return has been initiated for your order</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> is being returned to our warehouse.</p>
      ${buildTrackingLine(order.awbCode, order.courierName)}
      <p style="margin:8px 0 0">We will process a refund once the package is received back.</p>
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}

async function handleReturned(payload: OrderEventPayload): Promise<void> {
  const order = await fetchOrderInfo(payload.orderId)
  if (!order) return

  await sendEmail({
    orderId: payload.orderId,
    userId: payload.userId,
    eventType: 'returned',
    subject: `Return Complete — ${order.orderNumber}`,
    html: await emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:18px">Your return has been processed</h2>
      <p style="margin:0 0 8px">Order <strong>${order.orderNumber}</strong> has been returned to our warehouse.</p>
      <p style="margin:0 0 8px">Your refund will be processed shortly.</p>
      <p style="margin:16px 0 0">— The ${env.STORE_NAME} Team</p>
    `),
  })
}
