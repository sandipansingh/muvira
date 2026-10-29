const assert = require('node:assert/strict')
const test = require('node:test')

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  LOG_LEVEL: 'fatal',
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_ANON_KEY: 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_example',
  RAZORPAY_KEY_SECRET: 'test-secret',
  RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

const { UpdateSettingsSchema } = require('../server/dist/modules/settings/schema.js')
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const { quoteCheckout } = require('../server/dist/modules/checkout/service.js')
const { normalizePickupLocations } = require('../server/dist/services/shiprocket.js')
const methods = Object.fromEntries(
  ['standard', 'express'].map((name) => [
    name,
    {
      enabled: true,
      label: name,
      description: 'Delivery estimate',
      charge_paisa: 0,
      free_threshold_paisa: 0,
    },
  ])
)

test('pickup DTO normalizes provider identifiers and pin_code without inventing a name', () => {
  const [location] = normalizePickupLocations([
    { id: 27, pickup_location: 'Warehouse', pin_code: 400001, city: 'Mumbai' },
  ])
  assert.equal(location.pickup_id, 27)
  assert.equal(location.pincode, '400001')
  assert.equal(location.pickup_location, 'Warehouse')
  assert.throws(() => normalizePickupLocations([{ id: 1, pin_code: '400001' }]))
})

test('settings reject fees and thresholds through both interfaces', () => {
  assert.equal(
    UpdateSettingsSchema.safeParse({
      shipping_rules: { shipping_charge_paisa: 1, free_shipping_threshold_paisa: 0 },
    }).success,
    false
  )
  assert.equal(UpdateSettingsSchema.safeParse({ shipping_methods: methods }).success, true)
  assert.equal(
    UpdateSettingsSchema.safeParse({
      shipping_methods: { ...methods, express: { ...methods.express, charge_paisa: 1 } },
    }).success,
    false
  )
  assert.equal(
    UpdateSettingsSchema.safeParse({
      shipping_methods: {
        ...methods,
        standard: { ...methods.standard, free_threshold_paisa: 100 },
      },
    }).success,
    false
  )
  assert.equal(
    UpdateSettingsSchema.safeParse({ shiprocket_settings: { default_weight_grams: 750 } }).success,
    true
  )
  assert.deepEqual(
    UpdateSettingsSchema.parse({ shiprocket_settings: { default_weight_grams: 750 } })
      .shiprocket_settings,
    { default_weight_grams: 750 }
  )
})

test('quotes require valid persisted shipping, are free for both methods, and enforce ₹1', async () => {
  const original = adminSupabase.from
  let config = methods
  let price = 100
  adminSupabase.from = (relation) => {
    const result = () => ({
      data:
        relation === 'site_settings'
          ? config
            ? { value: config }
            : null
          : [
              {
                product_id: 'product',
                quantity: 1,
                products: {
                  id: 'product',
                  name: 'Product',
                  price_paisa: price,
                  stock: 5,
                  is_active: true,
                },
              },
            ],
      error: null,
    })
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => result(),
      then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
    }
    return query
  }
  try {
    for (const shipping_method of ['standard', 'express']) {
      const quote = await quoteCheckout('user', { shipping_method })
      assert.equal(quote.shipping_amount_paisa, 0)
      assert.equal(quote.total_amount_paisa, 100)
    }
    config = null
    await assert.rejects(quoteCheckout('user', { shipping_method: 'standard' }), {
      code: 'SHIPPING_CONFIG_INVALID',
    })
    config = { ...methods, express: { ...methods.express, charge_paisa: 1 } }
    await assert.rejects(quoteCheckout('user', { shipping_method: 'express' }), {
      code: 'SHIPPING_CONFIG_INVALID',
    })
    config = methods
    price = 99
    await assert.rejects(quoteCheckout('user', { shipping_method: 'standard' }), {
      code: 'ORDER_BELOW_MINIMUM',
    })
  } finally {
    adminSupabase.from = original
  }
})
