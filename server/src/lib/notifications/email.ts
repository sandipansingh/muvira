import { Resend } from 'resend'
import { env } from '../../config/env'
import { logger } from '../logger'
import { adminSupabase } from '../supabase/admin'
import type { Order } from '../../types'

let resend: Resend | null = null

if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY)
}

interface OrderConfirmationData {
  order: Order
  customerName: string
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  if (!resend) {
    logger.info({ orderId: data.order.id }, 'Email skipped - RESEND_API_KEY not configured')
    return
  }

  try {
    // Always fetch fresh email from profiles using the order's user_id
    // (never trust a passed-in email or user_id as "to")
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('id', data.order.user_id)
      .single()

    const toEmail = profile?.email

    if (!toEmail) {
      logger.warn(
        { orderId: data.order.id, userId: data.order.user_id },
        'No email address found for user - skipping order confirmation email'
      )
      return
    }

    const totalRupees = (data.order.total_amount_paisa / 100).toFixed(2)

    await resend.emails.send({
      from: `${env.STORE_NAME} <${env.EMAIL_FROM}>`,
      to: toEmail,
      subject: `Order Confirmed - ${data.order.order_number}`,
      html: `
        <h2>Thank you for your order, ${data.customerName}!</h2>
        <p>Your order <strong>${data.order.order_number}</strong> has been confirmed.</p>
        <p><strong>Total: ₹${totalRupees}</strong></p>
        <p>We will notify you when your order ships.</p>
        <p>- The ${env.STORE_NAME} Team</p>
      `,
    })

    logger.info(
      { orderId: data.order.id, orderNumber: data.order.order_number, to: toEmail },
      'Order confirmation email sent'
    )
  } catch (err) {
    // Do NOT rethrow - email failure must not affect order confirmation
    logger.error(
      { err, orderId: data.order.id },
      'Failed to send order confirmation email - will need manual retry'
    )
  }
}
