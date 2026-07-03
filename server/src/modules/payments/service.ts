import { adminSupabase } from '../../lib/supabase/admin'
import { verifyPaymentSignature, verifyWebhookSignature } from '../../lib/razorpay/verifySignature'
import { logger } from '../../lib/logger'
import { sendOrderConfirmationEmail } from '../../lib/notifications/email'
import { emitOrderEvent } from '../../services/eventBus'
import { AppError } from '../../types'
import type { Order } from '../../types'
import type { VerifyPaymentInput } from './schema'
//
// capturePayment - THE SINGLE IDEMPOTENT PAYMENT CAPTURE FUNCTION
//
// This is the ONLY place in the codebase where payment_status is set to 'paid'
// or payments.status is set to 'captured'. All other code paths are forbidden
// from doing this.
//
// Called by:
//   1. verifyPayment (client-side verification after Razorpay Checkout)
//   2. processWebhookCapture (server-to-server Razorpay webhook)
//
// IDEMPOTENCY: If the payment is already 'captured', returns success without
// re-running side effects. This is critical because:
//   - The webhook path may fire even after the client already called /verify
//   - Razorpay retries webhooks on non-2xx responses (duplicates are normal)
//

async function capturePayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ alreadyCaptured: boolean; order: Order }> {
  // Fetch the payment row
  const { data: payment } = await adminSupabase
    .from('payments')
    .select('id, order_id, status, amount_paisa')
    .eq('razorpay_order_id', razorpayOrderId)
    .single()

  if (!payment) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found')
  }

  // IDEMPOTENCY GUARD
  // If already captured, return success immediately - do not re-run side effects.
  if (payment.status === 'captured') {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('id', payment.order_id)
      .single()
    return { alreadyCaptured: true, order: order as Order }
  }

  // Fetch the associated order
  const { data: order } = await adminSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', payment.order_id)
    .single()

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  // Mark payment as captured
  const { error: paymentUpdateError } = await adminSupabase
    .from('payments')
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: 'captured',
      captured_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  if (paymentUpdateError) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update payment status')
  }

  // Mark order as confirmed
  const { error: orderUpdateError } = await adminSupabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
    })
    .eq('id', order.id)

  if (orderUpdateError) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update order status')
  }

  // Atomic stock decrement
  // Uses the DB-level decrement_stock RPC (WHERE stock >= qty) - race-safe.
  // If stock is insufficient at this final point, flag the order for manual
  // reconciliation rather than failing the capture (payment already happened).
  const orderItems = order.order_items as Array<{
    product_id: string
    quantity: number
  }>

  for (const item of orderItems) {
    const { data: newStock, error: stockError } = await adminSupabase.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    })

    if (stockError || newStock === null) {
      // EDGE CASE: Stock was depleted by a concurrent order between checkout
      // and capture. The payment succeeded at Razorpay - do NOT refund automatically.
      // Flag the order for admin reconciliation.
      logger.error(
        { orderId: order.id, productId: item.product_id },
        'Stock insufficient at capture time - flagging order for admin reconciliation'
      )
      await adminSupabase
        .from('orders')
        .update({ fulfillment_status: 'exception' })
        .eq('id', order.id)
      // Continue processing other items - don't throw here
    }
  }

  // Atomic coupon usage increment
  if (order.coupon_id) {
    const { error: couponError } = await adminSupabase.rpc('increment_coupon_usage', {
      p_coupon_id: order.coupon_id,
    })

    if (couponError) {
      // Non-fatal: log and continue. Coupon over-usage is recoverable.
      logger.error(
        { error: couponError, couponId: order.coupon_id, orderId: order.id },
        'Failed to increment coupon usage - manual check needed'
      )
    }
  }

  // Clear the user's cart
  await adminSupabase.from('cart_items').delete().eq('user_id', order.user_id)

  // Log capture event
  await adminSupabase.from('payment_logs').insert({
    payment_id: payment.id,
    order_id: order.id,
    event_type: 'webhook_processed',
    payload: {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
    },
  })

  logger.info(
    { orderId: order.id, orderNumber: order.order_number, razorpayPaymentId },
    'Payment captured successfully'
  )

  // Fire-and-forget email notification via event bus
  // Do NOT await - email failure must not block the response
  emitOrderEvent('order:payment:captured', {
    orderId: order.id,
    orderNumber: order.order_number,
    userId: order.user_id,
    oldStatus: 'pending',
    newStatus: 'confirmed',
    source: 'system',
  })

  // Legacy email (will be replaced by event bus subscriber)
  sendOrderConfirmationEmail({
    order: order as Order,
    customerName: order.shipping_full_name,
  }).catch((err: unknown) => {
    logger.error({ err, orderId: order.id }, 'Order confirmation email failed (fire-and-forget)')
  })

  // Shiprocket order creation is now manual via admin fulfillment workflow.
  // Do NOT auto-create Shiprocket orders after payment capture.

  return { alreadyCaptured: false, order: order as Order }
}

//
// verifyPayment - called by POST /api/payments/verify
//
// Receives the three Razorpay Checkout return values, verifies signature,
// then calls capturePayment.
//

export async function verifyPayment(
  userId: string,
  input: VerifyPaymentInput
): Promise<{ order: Order; alreadyCaptured: boolean }> {
  // Fetch payment to verify it belongs to this user
  const { data: payment } = await adminSupabase
    .from('payments')
    .select('id, order_id, status')
    .eq('razorpay_order_id', input.razorpay_order_id)
    .single()

  if (!payment) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')
  }

  // Layer 2 ownership check: verify the order belongs to the calling user
  const { data: order } = await adminSupabase
    .from('orders')
    .select('user_id')
    .eq('id', payment.order_id)
    .single()

  if (!order || order.user_id !== userId) {
    // Return 404 - don't reveal whether order exists for another user
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  }

  // Log the attempt BEFORE verification (so even failed attempts are audited)
  await adminSupabase.from('payment_logs').insert({
    payment_id: payment.id,
    order_id: payment.order_id,
    event_type: 'verify_attempt',
    // SECURITY: Do NOT log the full signature or payment ID in plaintext at warn/error level
    payload: { razorpay_order_id: input.razorpay_order_id },
  })

  // SIGNATURE VERIFICATION
  // MUST use timingSafeEqual (done inside verifyPaymentSignature)
  const isValid = verifyPaymentSignature({
    razorpay_order_id: input.razorpay_order_id,
    razorpay_payment_id: input.razorpay_payment_id,
    razorpay_signature: input.razorpay_signature,
  })

  if (!isValid) {
    // Log failure - NEVER let a failed verification disappear silently
    await adminSupabase.from('payment_logs').insert({
      payment_id: payment.id,
      order_id: payment.order_id,
      event_type: 'verify_failure',
      payload: {
        razorpay_order_id: input.razorpay_order_id,
        reason: 'signature_mismatch',
      },
    })

    // Mark payment as failed
    await adminSupabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: 'Signature verification failed',
      })
      .eq('id', payment.id)

    await adminSupabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', payment.order_id)

    logger.warn(
      { orderId: payment.order_id, razorpayOrderId: input.razorpay_order_id },
      'Payment signature verification FAILED'
    )

    throw new AppError(
      400,
      'PAYMENT_SIGNATURE_INVALID',
      'Payment verification failed. Please contact support.'
    )
  }

  // Signature valid - log success
  await adminSupabase.from('payment_logs').insert({
    payment_id: payment.id,
    order_id: payment.order_id,
    event_type: 'verify_success',
    payload: { razorpay_order_id: input.razorpay_order_id },
  })

  logger.info(
    { orderId: payment.order_id, razorpayOrderId: input.razorpay_order_id },
    'Payment signature verified - proceeding to capture'
  )

  // Call the single idempotent capture function
  const result = await capturePayment(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature
  )

  return result
}

//
// processRazorpayWebhook - called by POST /api/webhooks/razorpay
//
// SECURITY REQUIREMENTS:
// 1. rawBody must be the raw request Buffer (not parsed JSON)
// 2. Signature is verified with RAZORPAY_WEBHOOK_SECRET (not API key secret)
// 3. Duplicate webhooks (Razorpay retries) are detected and no-op'd
//

export async function processRazorpayWebhook(
  rawBody: Buffer,
  signature: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw webhook payload has unknown structure
  payload: Record<string, any>
): Promise<{ status: 'processed' | 'duplicate' | 'ignored' }> {
  const event = payload['event'] as string | undefined
  const eventId = payload['id'] as string | undefined // Razorpay event ID for dedup

  // Log receipt of every webhook (before verification - for audit trail)
  await adminSupabase.from('payment_logs').insert({
    event_type: 'webhook_received',
    payload: { event, event_id: eventId },
    razorpay_event_id: eventId ?? null,
  })

  // Signature verification
  // Uses RAZORPAY_WEBHOOK_SECRET - separate from API key secret
  // Uses raw buffer - Razorpay signs the exact bytes sent
  const isValid = verifyWebhookSignature({ rawBody, signature })

  if (!isValid) {
    logger.warn({ event, eventId }, 'Webhook signature verification FAILED - rejecting')
    // Return 400 so Razorpay doesn't retry (signature mismatch is not retryable)
    throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature')
  }

  // Duplicate detection
  if (eventId) {
    const { data: isDuplicate } = await adminSupabase.rpc('check_webhook_duplicate', {
      p_event_id: eventId,
    })

    if (isDuplicate) {
      logger.info({ event, eventId }, 'Duplicate webhook received - no-op')
      await adminSupabase.from('payment_logs').insert({
        event_type: 'webhook_duplicate',
        payload: { event, event_id: eventId },
        razorpay_event_id: eventId,
      })
      return { status: 'duplicate' }
    }
  }

  // Process event types
  if (event === 'payment.captured') {
    const razorpayPayment = payload['payload']?.['payment']?.['entity'] as
      | { order_id: string; id: string }
      | undefined

    if (!razorpayPayment?.order_id || !razorpayPayment?.id) {
      logger.error({ payload }, 'Malformed payment.captured webhook payload')
      throw new AppError(400, 'WEBHOOK_MALFORMED', 'Malformed webhook payload')
    }

    await capturePayment(
      razorpayPayment.order_id,
      razorpayPayment.id,
      '' // signature is not available in webhook payload; idempotency guard handles re-capture
    )

    await adminSupabase.from('payment_logs').insert({
      event_type: 'webhook_processed',
      payload: {
        event,
        event_id: eventId,
        razorpay_payment_id: razorpayPayment.id,
      },
      razorpay_event_id: eventId ?? null,
    })

    return { status: 'processed' }
  }

  if (event === 'payment.failed') {
    const razorpayPayment = payload['payload']?.['payment']?.['entity'] as
      | { order_id: string; id: string; error_description?: string }
      | undefined

    if (!razorpayPayment?.order_id) {
      return { status: 'ignored' }
    }

    // Mark payment as failed in our DB
    await adminSupabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: razorpayPayment.error_description ?? 'Payment failed',
        razorpay_payment_id: razorpayPayment.id,
      })
      .eq('razorpay_order_id', razorpayPayment.order_id)

    await adminSupabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq(
        'id',
        (
          await adminSupabase
            .from('payments')
            .select('order_id')
            .eq('razorpay_order_id', razorpayPayment.order_id)
            .single()
        ).data?.order_id
      )

    await adminSupabase.from('payment_logs').insert({
      event_type: 'webhook_processed',
      payload: {
        event,
        event_id: eventId,
        failure_reason: razorpayPayment.error_description,
      },
      razorpay_event_id: eventId ?? null,
    })

    logger.info({ razorpayOrderId: razorpayPayment.order_id }, 'Payment.failed webhook processed')
    return { status: 'processed' }
  }

  // Other event types (payment.authorized, refund.*, etc.) - log and ignore for now
  logger.info({ event }, 'Unhandled webhook event type - ignoring')
  return { status: 'ignored' }
}
