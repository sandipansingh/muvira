const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const { adminGetOrder } = require('../server/dist/modules/orders/service.js')

function mockOrder(t, persisted = {}, snapshot = {}) {
  t.mock.method(adminSupabase, 'from', (table) => {
    const data =
      table === 'orders'
        ? {
            id: 'order',
            payments: [],
            provider_operations: [],
            package_weight_grams: null,
            package_length_cm: null,
            package_breadth_cm: null,
            package_height_cm: null,
            pickup_location: null,
            ...persisted,
          }
        : {
            package: { weight_grams: 2000, length_cm: 30, breadth_cm: 20, height_cm: 10 },
            pickup_location: 'Frozen warehouse',
            ...snapshot,
          }
    const query = {
      select: () => query,
      eq: () => query,
      single: async () => ({ data, error: null }),
      maybeSingle: async () => ({ data, error: null }),
    }
    return query
  })
}

test('admin order exposes only frozen package scalars so default fulfillment preserves multi-quantity weight', async (t) => {
  mockOrder(t)
  const order = await adminGetOrder('order')
  assert.equal(order.package_weight_grams, 2000)
  assert.equal(order.package_length_cm, 30)
  assert.equal(order.package_breadth_cm, 20)
  assert.equal(order.package_height_cm, 10)
  assert.equal(order.pickup_location, 'Frozen warehouse')
  assert.equal('context' in order, false)
  assert.equal('verification' in order, false)
})

test('persisted staff package overrides take precedence over frozen checkout defaults', async (t) => {
  mockOrder(t, {
    package_weight_grams: 2500,
    package_length_cm: 35,
    pickup_location: 'Staff warehouse',
  })
  const order = await adminGetOrder('order')
  assert.equal(order.package_weight_grams, 2500)
  assert.equal(order.package_length_cm, 35)
  assert.equal(order.pickup_location, 'Staff warehouse')
  assert.equal(order.package_breadth_cm, 20)
})

test('invalid private package values never become fulfillment defaults', async (t) => {
  mockOrder(
    t,
    {},
    {
      package: { weight_grams: -1, length_cm: '30', breadth_cm: 2.5, height_cm: null },
      pickup_location: { secret: 'private' },
    }
  )
  const order = await adminGetOrder('order')
  assert.equal(order.package_weight_grams, null)
  assert.equal(order.package_length_cm, null)
  assert.equal(order.package_breadth_cm, null)
  assert.equal(order.package_height_cm, null)
  assert.equal(order.pickup_location, null)
})
