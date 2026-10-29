const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const service = require('../server/dist/modules/orders/service.js')
const provider = require('../server/dist/services/shiprocket.js')

test('fulfillment keeps distinct billing/shipping snapshots and resolves configured weights', async () => {
  const original = adminSupabase.from
  const settings = {
    pickup_location: 'Registered',
    default_length_cm: 15,
    default_breadth_cm: 10,
    default_height_cm: 5,
    default_weight_grams: 750,
  }
  adminSupabase.from = (relation) => {
    const q = {
      select: () => q,
      eq: () => q,
      single: async () => ({ data: { value: settings }, error: null }),
      in: async () => ({
        data: [
          { id: 'one', weight_grams: 200 },
          { id: 'two', weight_grams: null },
        ],
        error: null,
      }),
    }
    return q
  }
  const order = {
    order_number: 'ORDER-1',
    created_at: '2026-10-01T00:00:00Z',
    payment_status: 'paid',
    contact_email: 'buyer@example.com',
    shipping_full_name: 'Shipping Person',
    shipping_phone: '9876543210',
    shipping_address_line1: 'Ship line one',
    shipping_address_line2: 'Ship line two',
    shipping_city: 'Mumbai',
    shipping_state: 'Maharashtra',
    shipping_pincode: '400001',
    shipping_country: 'India',
    billing_same_as_shipping: false,
    billing_full_name: 'Billing Person',
    billing_address_line1: 'Bill line one',
    billing_address_line2: 'Bill line two',
    billing_city: 'Kolkata',
    billing_state: 'West Bengal',
    billing_pincode: '700001',
    billing_country: 'India',
    billing_gst_number: '19ABCDE1234F1Z5',
    subtotal_paisa: 10000,
    discount_amount_paisa: 500,
    shipping_amount_paisa: 0,
  }
  const items = [
    { product_id: 'one', product_name: 'One', quantity: 1, unit_price_paisa: 5000 },
    { product_id: 'two', product_name: 'Two', quantity: 2, unit_price_paisa: 2500 },
  ]
  try {
    const payload = await service.buildShiprocketOrderPayload(order, items, {})
    assert.equal(payload.shipping_is_billing, false)
    assert.equal(payload.billing_address, 'Bill line one')
    assert.equal(payload.billing_address_2, 'Bill line two')
    assert.equal(payload.billing_city, 'Kolkata')
    assert.equal(payload.shipping_city, 'Mumbai')
    assert.equal(payload.shipping_address, 'Ship line one')
    assert.equal(payload.customer_gstin, order.billing_gst_number)
    assert.equal(payload.weight, 1.7)
    assert.equal(payload.package_weight_grams, 1700)
    assert.equal(payload.sub_total, 95)
    assert.equal(payload.shipping_charges, 0)
    assert.equal(
      (
        await service.buildShiprocketOrderPayload(
          { ...order, package_weight_grams: 1200 },
          items,
          {}
        )
      ).weight,
      1.2
    )
    assert.equal(
      (
        await service.buildShiprocketOrderPayload({ ...order, package_weight_grams: 1200 }, items, {
          weightGrams: 600,
        })
      ).weight,
      0.6
    )
    assert.equal((await service.buildShiprocketOrderPayload(order, [], {})).weight, 0.75)
  } finally {
    adminSupabase.from = original
  }
})

test('provider document success requires a business success indicator and HTTPS URL', () => {
  assert.throws(() =>
    provider.assertDocumentResult(
      { label_created: 0, label_url: 'https://example.com/a.pdf' },
      'label'
    )
  )
  assert.throws(() =>
    provider.assertDocumentResult({ label_created: 1, label_url: 'javascript:alert(1)' }, 'label')
  )
  assert.throws(() =>
    provider.assertDocumentResult(
      { status: 0, manifest_url: 'https://example.com/a.pdf' },
      'manifest'
    )
  )
  assert.equal(
    provider.assertDocumentResult(
      { label_created: 1, label_url: 'https://example.com/a.pdf' },
      'label'
    ),
    'https://example.com/a.pdf'
  )
})

test('Shiprocket wire contracts use postcode/kg, accept confirmed pickup objects and reject business failures', async (t) => {
  const configuration = require('../server/dist/config/env.js').env
  const previousMode = configuration.RAZORPAY_MODE
  configuration.RAZORPAY_MODE = 'live'
  t.after(() => {
    configuration.RAZORPAY_MODE = previousMode
  })
  const originalFetch = global.fetch
  t.after(() => {
    global.fetch = originalFetch
  })
  let body = {},
    lastUrl
  global.fetch = async (url) => {
    lastUrl = String(url)
    return new Response(
      JSON.stringify(lastUrl.endsWith('/auth/login') ? { token: 'fixture' } : body),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }
  body = {
    data: {
      available_courier_companies: [
        { courier_company_id: 5, courier_name: 'Fixture', rate: 42.35 },
      ],
    },
  }
  const carriers = await provider.checkServiceability({
    pickup_pincode: '400001',
    delivery_pincode: '700001',
    weight_grams: 500,
    cod: false,
  })
  const params = new URL(lastUrl).searchParams
  assert.equal(params.get('pickup_postcode'), '400001')
  assert.equal(params.get('delivery_postcode'), '700001')
  assert.equal(params.get('weight'), '0.5')
  assert.equal(carriers.available_courier[0].rate_paisa, 4235)
  body = {
    pickup_status: 1,
    response: {
      status: 3,
      pickup_scheduled_date: '2026-10-27 09:00:00',
      pickup_token_number: 'fixture',
    },
  }
  assert.equal(
    (await provider.schedulePickup({ shipment_id: [1] })).response.pickup_token_number,
    'fixture'
  )
  for (const status of [4, 13, 20]) {
    body = { pickup_status: 1, response: { status, pickup_scheduled_date: '2026-10-27 09:00:00' } }
    await assert.rejects(provider.schedulePickup({ shipment_id: [1] }))
  }
  body = { order_id: 123, shipment_id: 234, status: 'NEW', status_code: 1 }
  assert.equal((await provider.createOrder({})).shipment_id, 234)
  for (const result of [
    { order_id: 0, shipment_id: 0, status: 'NEW', status_code: 1 },
    { order_id: 123, shipment_id: 234, status: 'ERROR', status_code: 0 },
  ]) {
    body = result
    await assert.rejects(provider.createOrder({}))
  }
})
