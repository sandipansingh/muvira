const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')

function configureTestEnvironment() {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '4000',
    LOG_LEVEL: 'fatal',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key-value',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-value',
    RAZORPAY_KEY_ID: 'rzp_test_example',
    RAZORPAY_KEY_SECRET: 'payment-signature-secret',
    RAZORPAY_WEBHOOK_SECRET: 'webhook-signature-secret',
    ALLOWED_ORIGINS: 'http://localhost:5173',
    EMAIL_FROM: 'orders@example.com',
    SHIPROCKET_EMAIL: 'shipping@example.com',
    SHIPROCKET_PASSWORD: 'test-password',
    SHIPROCKET_WEBHOOK_ENABLED: 'false',
  })
}

configureTestEnvironment()

const {
  isTerminalStatus,
  isValidTransition,
  shiprocketStatusToOrderStatus,
} = require('../server/dist/modules/orders/stateMachine.js')
const {
  CheckoutQuoteSchema,
  CreateCheckoutOrderSchema,
} = require('../server/dist/modules/checkout/schema.js')
const {
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../server/dist/lib/razorpay/verifySignature.js')

test('Razorpay callback verification accepts only the expected HMAC', () => {
  const orderId = 'order_provider_123'
  const paymentId = 'pay_provider_123'
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  assert.equal(
    verifyPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
    true
  )
  assert.equal(
    verifyPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: `${signature.slice(0, -1)}0`,
    }),
    false
  )
})

test('Razorpay webhooks verify the raw request bytes', () => {
  const rawBody = Buffer.from('{"event":"payment.captured"}')
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  assert.equal(verifyWebhookSignature({ rawBody, signature }), true)
  assert.equal(verifyWebhookSignature({ rawBody: Buffer.from('{}'), signature }), false)
})

test('checkout contracts reject client-controlled totals and unknown payment fields', () => {
  assert.equal(
    CheckoutQuoteSchema.safeParse({
      shipping_method: 'standard',
      subtotal_paisa: 1,
    }).success,
    false
  )
  assert.equal(
    CreateCheckoutOrderSchema.safeParse({
      shipping_method: 'express',
      address_id: '35ea34cb-c9a9-4377-bbea-23b1ca0dce61',
      billing_same_as_shipping: true,
      amount: 1,
    }).success,
    false
  )
})

test('order state transitions preserve terminal and RTO semantics', () => {
  assert.equal(isValidTransition('pending', 'confirmed'), true)
  assert.equal(isValidTransition('pending', 'delivered'), false)
  assert.equal(isTerminalStatus('refunded'), true)
  assert.equal(isTerminalStatus('delivery_failed'), false)
  assert.equal(shiprocketStatusToOrderStatus('RTO Delivered'), 'returned')
  assert.equal(shiprocketStatusToOrderStatus('Delivered'), 'delivered')
  assert.equal(shiprocketStatusToOrderStatus('Undelivered'), 'delivery_failed')
  assert.equal(shiprocketStatusToOrderStatus('Not Delivered'), 'delivery_failed')
  assert.equal(shiprocketStatusToOrderStatus('Not-Delivered'), 'delivery_failed')
  assert.equal(shiprocketStatusToOrderStatus('Out For Delivery'), 'out_for_delivery')
  assert.equal(shiprocketStatusToOrderStatus('Vendor-specific unknown state'), null)
})
