/**
 * Transactional email via Resend.
 *
 * DESIGN: email sending is FIRE-AND-FORGET relative to the payment-capture
 * transaction. A failed email must never fail or roll back a successful payment.
 * Log failures for later retry/reconciliation.
 *
 * If RESEND_API_KEY is not configured, emails are silently skipped (dev mode).
 */
import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../logger';
import type { Order } from '../../types';

let resend: Resend | null = null;

if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY);
}

interface OrderConfirmationData {
  order: Order;
  customerEmail: string;
  customerName: string;
}

/**
 * Sends an order-confirmation email.
 * This should be called AFTER the payment is captured and persisted.
 * Call without await so failures don't block the response.
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData,
): Promise<void> {
  if (!resend) {
    logger.info(
      { orderId: data.order.id },
      'Email skipped — RESEND_API_KEY not configured',
    );
    return;
  }

  try {
    const totalRupees = (data.order.total_amount_paisa / 100).toFixed(2);

    await resend.emails.send({
      from: `${env.STORE_NAME} <${env.EMAIL_FROM}>`,
      to: data.customerEmail,
      subject: `Order Confirmed — ${data.order.order_number}`,
      html: `
        <h2>Thank you for your order, ${data.customerName}!</h2>
        <p>Your order <strong>${data.order.order_number}</strong> has been confirmed.</p>
        <p><strong>Total: ₹${totalRupees}</strong></p>
        <p>We will notify you when your order ships.</p>
        <p>— The ${env.STORE_NAME} Team</p>
      `,
    });

    logger.info(
      { orderId: data.order.id, orderNumber: data.order.order_number },
      'Order confirmation email sent',
    );
  } catch (err) {
    // Do NOT rethrow — email failure must not affect order confirmation
    logger.error(
      { err, orderId: data.order.id },
      'Failed to send order confirmation email — will need manual retry',
    );
  }
}
