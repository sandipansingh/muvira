const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
require('../server/dist/config/env.js').env.RAZORPAY_MODE = 'live'
const provider = require('../server/dist/services/shiprocket.js')

test('Shiprocket refresh is single flight and ambiguous mutations are never replayed', async (t) => {
  const original = global.fetch
  t.after(() => {
    global.fetch = original
  })
  let logins = 0,
    mutations = 0
  global.fetch = async (url) => {
    if (String(url).endsWith('/auth/login')) {
      logins++
      await new Promise((resolve) => setTimeout(resolve, 10))
      return Response.json({ token: 'synthetic-token' })
    }
    return Response.json({ data: { shipping_address: [] } })
  }
  await Promise.all([provider.getPickupLocations(), provider.getPickupLocations()])
  assert.equal(logins, 1)
  global.fetch = async () => {
    mutations++
    throw new TypeError('fetch failed')
  }
  await assert.rejects(provider.createOrder({}))
  assert.equal(mutations, 1)
})

test('Shiprocket adapters accept nested reads, empty cancellation and string estimates', async (t) => {
  const original = global.fetch
  t.after(() => {
    global.fetch = original
  })
  let payload = null,
    lastUrl
  global.fetch = async (url) => {
    lastUrl = String(url)
    return payload === null ? new Response(null, { status: 204 }) : Response.json(payload)
  }
  assert.deepEqual(await provider.cancelOrder({ ids: [123] }), {})
  payload = {
    data: {
      id: 123,
      channel_order_id: 'MUV-SYNTHETIC',
      status: 'CANCELED',
      status_code: 5,
      total: '125.50',
      payment_method: 'Prepaid',
      shipments: [{ id: 234, awb: 'SYNTHETIC-AWB', courier: 'Fixture', status: 6 }],
    },
  }
  const details = await provider.getOrderDetails(123)
  assert.equal(details.order_id, 123)
  assert.equal(details.shipment_id, 234)
  assert.equal(details.awb_code, 'SYNTHETIC-AWB')
  assert.equal(details.merchant_order_id, 'MUV-SYNTHETIC')
  assert.equal(details.total_paisa, 12550)
  payload = {
    data: {
      available_courier_companies: [
        {
          courier_company_id: '5',
          courier_name: 'Fixture',
          rate: '42.35',
          estimated_delivery_days: '3',
        },
        { courier_company_id: 6, courier_name: 'Unknown estimate', rate: '40' },
      ],
    },
  }
  const result = await provider.checkServiceability({
    pickup_pincode: '400001',
    delivery_pincode: '700001',
    weight_grams: 500,
    cod: false,
    length_cm: 10,
    breadth_cm: 8,
    height_cm: 5,
    declared_value_paisa: 12550,
  })
  assert.equal(result.available_courier[0].courier_id, 5)
  assert.equal(result.available_courier[0].estimated_delivery_days, 3)
  assert.equal(result.available_courier[1].estimated_delivery_days, null)
  assert.equal(new URL(lastUrl).searchParams.get('declared_value'), '125.5')
  assert.equal(new URL(lastUrl).searchParams.get('length'), '10')
})

test('bulk tracking splits all AWBs into at most 50 per safe-read request', async (t) => {
  const original = global.fetch
  t.after(() => {
    global.fetch = original
  })
  const sizes = []
  global.fetch = async (_url, options) => {
    const { awbs } = JSON.parse(options.body)
    sizes.push(awbs.length)
    return Response.json(Object.fromEntries(awbs.map((awb) => [awb, { tracking_data: {} }])))
  }
  const awbs = Array.from({ length: 551 }, (_, index) => `SYNTHETIC-${index}`)
  assert.equal(Object.keys(await provider.trackBulk(awbs)).length, 551)
  assert.ok(sizes.every((size) => size <= 50))
  assert.equal(
    sizes.reduce((a, b) => a + b, 0),
    551
  )
})

test('NDR requires documented202 acknowledgement and never converts application failure to acceptance', async (t) => {
  const original = global.fetch
  t.after(() => {
    global.fetch = original
  })
  let calls = 0,
    response
  global.fetch = async () => {
    calls++
    return response()
  }
  for (const [status, body] of [
    [200, { status: 'Data Updated Sucessfully' }],
    [202, {}],
    [202, { status: 'Rejected' }],
  ]) {
    response = () => Response.json(body, { status })
    await assert.rejects(
      provider.submitNdrAction('SYNTHETIC', { action: 'return', comments: 'Synthetic return' })
    )
  }
  response = () => Response.json({ status: 'Data Updated Sucessfully' }, { status: 202 })
  assert.equal(
    (
      await provider.submitNdrAction('SYNTHETIC', {
        action: 'return',
        comments: 'Synthetic return',
      })
    ).accepted,
    true
  )
  assert.equal(calls, 4)
})
