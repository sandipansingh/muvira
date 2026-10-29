const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const { razorpay } = require('../server/dist/lib/razorpay/client.js')
const controller = require('../server/dist/modules/checkout/controller.js')

test('checkout exposes owned preparation and recovery controllers', () => {
  assert.equal(typeof controller.active, 'function')
  assert.equal(typeof controller.reconcile, 'function')
  assert.equal(typeof controller.paymentConfig, 'function')
})

test('checkout configuration exposes only public payment configuration', async () => {
  let body
  await controller.paymentConfig(
    {},
    {
      setHeader() {},
      json(value) {
        body = value
      },
    },
    (error) => {
      throw error
    }
  )
  assert.deepEqual(body, {
    success: true,
    data: {
      key_id: 'rzp_test_example',
      currency: 'INR',
      mode: 'test',
      upi: { intent: false, qr: false, embedded_qr: false },
    },
  })
})

test('preparation rejects a changed request before dispatching a provider order', async (t) => {
  t.mock.method(adminSupabase, 'rpc', async (name) => {
    assert.equal(name, 'lookup_checkout_preparation')
    return { data: { conflict: 'CHECKOUT_REQUEST_CONFLICT' }, error: null }
  })
  t.mock.method(razorpay.orders, 'create', async () => {
    assert.fail('must not create another order')
  })
  let failure
  await controller.createOrder(
    {
      user: { id: 'customer' },
      body: {
        checkout_request_id: 'request',
        address_id: 'address',
        shipping_method: 'standard',
        billing_same_as_shipping: true,
      },
    },
    {},
    (error) => {
      failure = error
    }
  )
  assert.equal(failure?.code, 'CHECKOUT_REQUEST_CONFLICT')
})

test('payment configuration gates UPI by live mode, enabled flags and embedded approval', () => {
  const { env } = require('../server/dist/config/env.js')
  const keys = [
    'RAZORPAY_MODE',
    'RAZORPAY_UPI_INTENT_ENABLED',
    'RAZORPAY_UPI_QR_ENABLED',
    'RAZORPAY_UPI_EMBEDDED_QR_APPROVED',
  ]
  const previous = Object.fromEntries(keys.map((key) => [key, env[key]]))
  try {
    for (const [mode, intent, qr, approved, expected] of [
      ['test', 'true', 'true', 'true', { intent: false, qr: false, embedded_qr: false }],
      ['live', 'false', 'false', 'true', { intent: false, qr: false, embedded_qr: false }],
      ['live', 'true', 'false', 'true', { intent: true, qr: false, embedded_qr: false }],
      ['live', 'false', 'true', 'false', { intent: false, qr: true, embedded_qr: false }],
      ['live', 'true', 'true', 'false', { intent: true, qr: true, embedded_qr: false }],
      ['live', 'true', 'true', 'true', { intent: true, qr: true, embedded_qr: true }],
    ]) {
      Object.assign(
        env,
        Object.fromEntries(keys.map((key, i) => [key, [mode, intent, qr, approved][i]]))
      )
      let response
      controller.paymentConfig(
        {},
        {
          setHeader() {},
          json(value) {
            response = value
          },
        }
      )
      assert.deepEqual(response.data.upi, expected)
      assert.deepEqual(Object.keys(response.data).sort(), ['currency', 'key_id', 'mode', 'upi'])
    }
  } finally {
    Object.assign(env, previous)
  }
})

test('reconciliation checks ownership before contacting Razorpay', async (t) => {
  const query = {
    select() {
      return query
    },
    eq() {
      return query
    },
    async maybeSingle() {
      return { data: null, error: null }
    },
  }
  t.mock.method(adminSupabase, 'from', () => query)
  t.mock.method(razorpay.orders, 'fetch', async () => {
    assert.fail('must check ownership first')
  })
  let failure
  await controller.reconcile(
    { user: { id: 'stranger' }, params: { orderId: 'another-order' } },
    { setHeader() {} },
    (error) => {
      failure = error
    }
  )
  assert.equal(failure?.code, 'ORDER_NOT_FOUND')
})
