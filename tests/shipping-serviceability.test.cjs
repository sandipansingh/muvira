const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()

const {
  rankServiceableCouriers,
  checkShippingServiceability,
  packageFromCheckoutContext,
} = require('../server/dist/services/shippingServiceability.js')
const provider = require('../server/dist/services/shiprocket.js')
const courier = (id, rate, days) => ({
  courier_id: id,
  courier_name: `Courier ${id}`,
  rate_paisa: rate,
  estimated_delivery_days: days,
  cod: false,
})

test('courier recommendations use stable cost/estimate/id ties and preserve unknown estimates', () => {
  const couriers = [
    courier(4, 100, null),
    courier(3, 100, 3),
    courier(2, 100, 3),
    courier(1, 200, 1),
  ]
  assert.deepEqual(
    rankServiceableCouriers(couriers, 'standard').map((c) => c.courier_id),
    [2, 3, 4, 1]
  )
  assert.deepEqual(
    rankServiceableCouriers(couriers, 'express').map((c) => c.courier_id),
    [1, 2, 3]
  )
  assert.deepEqual(rankServiceableCouriers([courier(4, 100, null)], 'express'), [])
})

test('server package uses purchased quantity, defaults only for missing weights and integer paisa', () => {
  assert.deepEqual(
    packageFromCheckoutContext({
      cart: [
        { quantity: 2, weight_grams: 100 },
        { quantity: 3, weight_grams: null },
      ],
      shiprocket_settings: {
        pickup_location: 'Warehouse',
        default_weight_grams: 500,
        default_length_cm: 20,
        default_breadth_cm: 10,
        default_height_cm: 5,
      },
      declared_value_paisa: 19900,
    }),
    { weight_grams: 1700, length_cm: 20, breadth_cm: 10, height_cm: 5, declared_value_paisa: 19900 }
  )
})

test('serviceability sends exact registered pickup, dimensions, prepaid and value; outage blocks', async (t) => {
  t.mock.method(provider, 'getPickupLocations', async () => [
    { pickup_location: 'Warehouse', pincode: '400001', pickup_id: 1 },
  ])
  let requested
  t.mock.method(provider, 'checkServiceability', async (input) => {
    requested = input
    return { available_courier: [courier(2, 5000, null)] }
  })
  const input = {
    pickup_location: 'Warehouse',
    delivery_pincode: '700039',
    shipping_method: 'standard',
    weight_grams: 500,
    length_cm: 10,
    breadth_cm: 10,
    height_cm: 5,
    declared_value_paisa: 19900,
  }
  const result = await checkShippingServiceability(input)
  assert.equal(result.available, true)
  assert.equal(result.estimated_delivery_days, null)
  assert.deepEqual(requested, {
    pickup_pincode: '400001',
    delivery_pincode: '700039',
    cod: false,
    weight_grams: 500,
    length_cm: 10,
    breadth_cm: 10,
    height_cm: 5,
    declared_value_paisa: 19900,
  })
  assert.equal(
    (await checkShippingServiceability({ ...input, shipping_method: 'express' })).available,
    false
  )
  provider.checkServiceability = async () => {
    throw new Error('provider unavailable')
  }
  await assert.rejects(checkShippingServiceability(input), {
    code: 'SHIPPING_SERVICEABILITY_UNAVAILABLE',
  })
})
