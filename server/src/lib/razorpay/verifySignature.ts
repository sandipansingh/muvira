/**
 * Razorpay signature utilities.
 *
 * Two separate verification functions:
 *  1. verifyPaymentSignature — for POST /payments/verify (uses API key secret)
 *  2. verifyWebhookSignature — for POST /webhooks/razorpay (uses webhook secret)
 *
 * SECURITY REQUIREMENTS:
 *  - Use crypto.timingSafeEqual for ALL comparisons (prevents timing attacks)
 *  - Never use === for signature comparison
 *  - Secrets come only from env vars, never from request input
 */
import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Verifies the Razorpay payment signature returned by Razorpay Checkout.
 * Formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 *
 * @returns true only if signatures match via constant-time comparison
 */
export function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const body = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  // MUST use timingSafeEqual — prevents timing-based signature forgery attacks
  try {
    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(params.razorpay_signature, 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * Verifies the X-Razorpay-Signature header on incoming webhook events.
 * Formula: HMAC-SHA256(raw_request_body, WEBHOOK_SECRET)
 *
 * IMPORTANT: rawBody must be the raw Buffer — NOT parsed JSON.
 * Razorpay signs the exact bytes it sent, so any JSON re-serialization
 * will break the signature.
 *
 * Uses RAZORPAY_WEBHOOK_SECRET — a SEPARATE secret from RAZORPAY_KEY_SECRET.
 */
export function verifyWebhookSignature(params: {
  rawBody: Buffer;
  signature: string;
}): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(params.rawBody)
    .digest('hex');

  try {
    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(params.signature, 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
