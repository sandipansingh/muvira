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
  assert.deepEqual(body, { success: true, data: { key_id: 'rzp_test_example', currency: 'INR' } })
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
