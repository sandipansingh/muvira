const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const provider = require('../server/dist/services/shiprocket.js')
const { createCheckoutOrder, quoteCheckout } = require('../server/dist/modules/checkout/service.js')
const { prepareCheckoutPayment } = require('../server/dist/modules/checkout/session.js')
const userId = '11111111-1111-4111-8111-111111111111'
const addressId = '22222222-2222-4222-8222-222222222222'
const productId = '33333333-3333-4333-8333-333333333333'
const methods = Object.fromEntries(
  ['standard', 'express'].map((method) => [
    method,
    {
      enabled: true,
      label: method,
      description: 'Configured editorial description',
      charge_paisa: 0,
      free_threshold_paisa: 0,
    },
  ])
)
const context = {
  cart: [{ product_id: productId, quantity: 2, price_paisa: 19900, weight_grams: 200 }],
  address: { id: addressId, pincode: '700039', country: 'India' },
  shipping_method: 'standard',
  shipping_methods: methods,
  shiprocket_settings: {
    pickup_location: 'Warehouse',
    default_weight_grams: 500,
    default_length_cm: 20,
    default_breadth_cm: 10,
    default_height_cm: 5,
  },
  declared_value_paisa: 39800,
}
const input = { address_id: addressId, shipping_method: 'standard', billing_same_as_shipping: true }
function mockProviders(t, couriers = []) {
  t.mock.method(provider, 'getPickupLocations', async () => [
    { pickup_location: 'Warehouse', pincode: '400001', pickup_id: 1 },
  ])
  t.mock.method(provider, 'checkServiceability', async () => ({ available_courier: couriers }))
}
function mockQuoteReads(t) {
  t.mock.method(adminSupabase, 'from', (relation) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: { value: methods }, error: null }),
      then: (resolve, reject) =>
        Promise.resolve({
          data: [
            {
              product_id: productId,
              quantity: 2,
              products: {
                id: productId,
                name: 'Product',
                price_paisa: 19900,
                stock: 5,
                is_active: true,
              },
            },
          ],
          error: null,
        }).then(resolve, reject),
    }
    assert.ok(['site_settings', 'cart_items'].includes(relation))
    return query
  })
}

test('addressless quote is a free preview without delivery promises or provider requests', async (t) => {
  mockQuoteReads(t)
  t.mock.method(provider, 'checkServiceability', async () =>
    assert.fail('preview must not call provider')
  )
  const quote = await quoteCheckout(userId, { shipping_method: 'standard' })
  assert.equal(quote.is_preview, true)
  assert.equal(quote.delivery_available, null)
  assert.equal(quote.estimated_delivery_days, null)
  assert.equal(quote.shipping_amount_paisa, 0)
  assert.match(quote.shipping_description, /Select an address/)
})

test('owned address quote keeps standard available with unknown estimate and excludes express', async (t) => {
  mockQuoteReads(t)
  t.mock.method(adminSupabase, 'rpc', async (name, args) => {
    assert.equal(name, 'get_checkout_shipping_context')
    assert.equal(args.p_user_id, userId)
    assert.equal(args.p_address_id, addressId)
    return { data: { context, fingerprint: 'a'.repeat(64) }, error: null }
  })
  mockProviders(t, [
    {
      courier_id: 1,
      courier_name: 'Courier',
      rate_paisa: 5500,
      estimated_delivery_days: null,
      cod: false,
    },
  ])
  const quote = await quoteCheckout(userId, { shipping_method: 'standard', address_id: addressId })
  assert.equal(quote.delivery_available, true)
  assert.equal(quote.estimated_delivery_days, null)
  assert.equal(quote.shipping_methods.standard.available, true)
  assert.equal(quote.shipping_methods.express.available, false)
  assert.equal(quote.shipping_methods.express.estimated_delivery_days, null)
  assert.match(quote.shipping_description, /estimate unavailable/)
  assert.equal(quote.total_amount_paisa, 39800)
})

for (const session of [false, true]) {
  test(`${session ? 'session' : 'legacy'} preparation blocks an outage before reservation and Razorpay`, async (t) => {
    const calls = []
    t.mock.method(adminSupabase, 'rpc', async (name) => {
      calls.push(name)
      if (name === 'lookup_checkout_preparation') return { data: null, error: null }
      assert.equal(name, 'get_checkout_shipping_context')
      return { data: { context, fingerprint: 'a'.repeat(64) }, error: null }
    })
    mockProviders(t)
    provider.checkServiceability = async () => {
      throw new Error('outage')
    }
    await assert.rejects(
      session
        ? prepareCheckoutPayment(userId, {
            ...input,
            checkout_request_id: '44444444-4444-4444-8444-444444444444',
          })
        : createCheckoutOrder(userId, input),
      { code: 'SHIPPING_SERVICEABILITY_UNAVAILABLE' }
    )
    assert.equal(
      calls.some((name) => /initialize_checkout|prepare_checkout_session/.test(name)),
      false
    )
  })
  test(`${session ? 'session' : 'legacy'} preparation passes verified context to atomic reservation and exposes race conflict`, async (t) => {
    t.mock.method(adminSupabase, 'rpc', async (name, args) => {
      if (name === 'lookup_checkout_preparation') return { data: null, error: null }
      if (name === 'get_checkout_shipping_context')
        return { data: { context, fingerprint: 'a'.repeat(64) }, error: null }
      assert.equal(
        name,
        session ? 'prepare_checkout_session_shipping' : 'initialize_checkout_shipping'
      )
      assert.equal(args.p_shipping_verification.fingerprint, 'a'.repeat(64))
      assert.deepEqual(args.p_shipping_verification.context, context)
      assert.equal(args.p_shipping_verification.package.weight_grams, 400)
      return { data: null, error: { code: '40001', message: 'Delivery details changed' } }
    })
    mockProviders(t, [
      {
        courier_id: 1,
        courier_name: 'Courier',
        rate_paisa: 5500,
        estimated_delivery_days: 2,
        cod: false,
      },
    ])
    await assert.rejects(
      session
        ? prepareCheckoutPayment(userId, {
            ...input,
            checkout_request_id: '44444444-4444-4444-8444-444444444444',
          })
        : createCheckoutOrder(userId, input),
      { code: 'SHIPPING_CONTEXT_CHANGED', statusCode: 409 }
    )
  })
}

test('foreign address is rejected before serviceability', async (t) => {
  t.mock.method(adminSupabase, 'rpc', async () => ({
    data: null,
    error: { code: 'P0002', message: 'Shipping address not found' },
  }))
  t.mock.method(provider, 'getPickupLocations', async () =>
    assert.fail('must check ownership first')
  )
  await assert.rejects(createCheckoutOrder(userId, input), {
    code: 'ADDRESS_OR_CART_NOT_FOUND',
    statusCode: 404,
  })
})
