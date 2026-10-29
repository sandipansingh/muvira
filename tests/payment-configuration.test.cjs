const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { paymentConfigurationIssues } = require('../server/dist/config/payment.js')
const { CreateCheckoutOrderSchema } = require('../server/dist/modules/checkout/schema.js')
const { PaymentDiagnosticSchema } = require('../server/dist/modules/checkout/schema.js')

const config = {
  NODE_ENV: 'development',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  RAZORPAY_MODE: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_Abc12345678901',
  RAZORPAY_KEY_SECRET: 'secret-for-test',
  RAZORPAY_WEBHOOK_SECRET: 'webhook-for-test',
}
test('payment configuration rejects shared databases, mismatched modes and placeholders', () => {
  assert.deepEqual(paymentConfigurationIssues(config), [])
  assert.ok(paymentConfigurationIssues({ ...config, SUPABASE_URL: 'invalid-url' }).length)
  assert.ok(
    paymentConfigurationIssues({ ...config, SUPABASE_URL: 'https://shared.supabase.co' }).length
  )
  assert.ok(
    paymentConfigurationIssues({
      ...config,
      NODE_ENV: 'test',
      SUPABASE_URL: 'https://shared.supabase.co',
    }).length
  )
  assert.ok(
    paymentConfigurationIssues({
      ...config,
      NODE_ENV: 'test',
      RAZORPAY_MODE: 'live',
      RAZORPAY_KEY_ID: 'rzp_live_fixture',
    }).length
  )
  assert.ok(paymentConfigurationIssues({ ...config, RAZORPAY_MODE: 'live' }).length)
  assert.ok(
    paymentConfigurationIssues({
      ...config,
      NODE_ENV: 'production',
      RAZORPAY_MODE: 'live',
      RAZORPAY_KEY_ID: 'rzp_live_fixture123',
    }).length
  )
  assert.ok(paymentConfigurationIssues({ ...config, RAZORPAY_KEY_ID: 'rzp_test_your_key' }).length)
})
test('storefront creation requires the durable checkout request UUID', () => {
  assert.equal(
    CreateCheckoutOrderSchema.safeParse({ address_id: '11111111-1111-4111-8111-111111111111' })
      .success,
    false
  )
})
test('advisory diagnostics reject payment credentials, descriptions and unbounded fields', () => {
  const input = {
    method: 'upi',
    flow: 'intent',
    reason: 'intent_no_apps_error',
    orderId: 'order_test',
  }
  assert.equal(PaymentDiagnosticSchema.safeParse(input).success, true)
  for (const change of [
    { description: 'private data' },
    { card: '4100280000001007' },
    { reason: 'vpa@example' },
    { source: 'a'.repeat(100) },
  ])
    assert.equal(PaymentDiagnosticSchema.safeParse({ ...input, ...change }).success, false)
})

test('fulfillment refuses an order from another payment environment before provider work', async (t) => {
  const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
  t.mock.method(adminSupabase, 'rpc', async (name) =>
    name === 'assert_razorpay_order_environment'
      ? { data: null, error: { code: '22023', message: 'mode mismatch' } }
      : { data: true, error: null }
  )
  const {
    assertFulfillmentMutationAllowed,
  } = require('../server/dist/services/providerOperations.js')
  await assert.rejects(assertFulfillmentMutationAllowed('order', {}), {
    code: 'PAYMENT_ENVIRONMENT_REVIEW',
  })
})
