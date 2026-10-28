require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')
const {
  createOrderFixture,
  cleanupOrderFixture,
  serviceClient,
  claimLease,
} = require('./helpers/provider-db-fixture.cjs')
const apiUrl = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'custom checkout preparation serializes concurrent requests and preserves dispatch uncertainty',
  { skip: !apiUrl || !key, timeout: 30000 },
  async (t) => {
    const client = serviceClient(apiUrl, key)
    const fixture = await createOrderFixture(client)
    const suffix = randomUUID()
    const insert = async (table, value) => {
      const result = await client.from(table).insert(value).select().single()
      assert.ifError(result.error)
      return result.data
    }
    const category = await insert('categories', {
      name: 'Checkout integration',
      slug: `checkout-${suffix}`,
    })
    const product = await insert('products', {
      name: 'Checkout integration product',
      slug: `checkout-${suffix}`,
      category_id: category.id,
      price_paisa: 49900,
      stock: 10,
      is_active: true,
    })
    const address = await insert('addresses', {
      user_id: fixture.userId,
      full_name: 'Checkout Test',
      phone: '9876543210',
      address_line1: 'Test lane',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700039',
      country: 'India',
    })
    await insert('cart_items', { user_id: fixture.userId, product_id: product.id, quantity: 1 })
    const { data: previous } = await client
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping_methods')
      .single()
    const config = {
      standard: {
        enabled: true,
        label: 'Standard',
        description: 'Test',
        charge_paisa: 0,
        free_threshold_paisa: 0,
      },
      express: {
        enabled: false,
        label: 'Express',
        description: 'Test',
        charge_paisa: 0,
        free_threshold_paisa: 0,
      },
    }
    assert.ifError(
      (await client.from('site_settings').upsert({ key: 'shipping_methods', value: config })).error
    )
    const createdOrders = new Set()
    t.after(async () => {
      for (const orderId of createdOrders)
        await cleanupOrderFixture(client, { ...fixture, orderId })
      await cleanupOrderFixture(client, fixture)
      await client.from('products').delete().eq('id', product.id)
      await client.from('categories').delete().eq('id', category.id)
      if (previous)
        await client
          .from('site_settings')
          .update({ value: previous.value })
          .eq('key', 'shipping_methods')
    })
    const args = {
      p_user_id: fixture.userId,
      p_request_id: randomUUID(),
      p_request_fingerprint: 'a'.repeat(64),
      p_checkout: {
        address_id: address.id,
        shipping_method: 'standard',
        billing_same_as_shipping: true,
      },
      p_order_prefix: 'TEST',
    }
    const [first, second] = await Promise.all([
      client.rpc('prepare_checkout_session', args),
      client.rpc('prepare_checkout_session', args),
    ])
    assert.ifError(first.error)
    assert.ifError(second.error)
    const orderId = first.data.order_id
    createdOrders.add(orderId)
    assert.equal(second.data.order_id, orderId)
    assert.equal([first.data.created, second.data.created].filter(Boolean).length, 1)
    const { data: reservations } = await client
      .from('inventory_reservations')
      .select('*')
      .eq('order_id', orderId)
    assert.equal(reservations.length, 1)
    assert.equal(reservations[0].quantity, 1)
    const changed = await client.rpc('prepare_checkout_session', {
      ...args,
      p_request_fingerprint: 'b'.repeat(64),
    })
    assert.equal(changed.data.conflict, 'CHECKOUT_REQUEST_CONFLICT')
    const replacement = await client.rpc('prepare_checkout_session', {
      ...args,
      p_request_id: randomUUID(),
    })
    assert.equal(replacement.data.conflict, 'CHECKOUT_ALREADY_ACTIVE')
    const lease = await claimLease(client, 'checkout_payment', orderId)
    const dispatchArgs = { p_order_id: orderId, ...lease }
    assert.equal((await client.rpc('claim_checkout_dispatch', dispatchArgs)).data, true)
    assert.equal((await client.rpc('claim_checkout_dispatch', dispatchArgs)).data, false)
    await client
      .from('orders')
      .update({ checkout_expires_at: new Date(Date.now() - 60000).toISOString() })
      .eq('id', orderId)
    assert.ifError((await client.rpc('expire_abandoned_checkouts', { p_limit: 1000 })).error)
    assert.equal(
      (await client.from('orders').select('status').eq('id', orderId).single()).data.status,
      'pending'
    )
    const anonymous = createClient(apiUrl, process.env.SUPABASE_TEST_ANON_KEY, {
      auth: { persistSession: false },
    })
    assert.ok((await anonymous.from('checkout_preparations').select('*')).error)
    assert.ok((await anonymous.rpc('active_checkout_ids', { p_user_id: fixture.userId })).error)
    const ready = await client.rpc('get_runtime_schema_status')
    assert.ifError(ready.error)
    assert.equal(ready.data.contract_version, 53)
    assert.equal(ready.data.ready, true)

    // A request that was never returned to the browser can expire after the bounded review window.
    await client
      .from('checkout_preparations')
      .update({ created_at: new Date(Date.now() - 25 * 3600000).toISOString() })
      .eq('order_id', orderId)
    assert.ifError((await client.rpc('expire_abandoned_checkouts', { p_limit: 1000 })).error)
    assert.equal(
      (await client.from('orders').select('status').eq('id', orderId).single()).data.status,
      'cancelled'
    )
    assert.equal((await client.rpc('prepare_checkout_session', args)).data.order_id, orderId)

    require('./helpers/test-env.cjs').configureTestEnvironment()
    const { razorpay } = require('../server/dist/lib/razorpay/client.js')
    const { prepareCheckoutPayment } = require('../server/dist/modules/checkout/session.js')
    let dispatches = 0
    let provider
    t.mock.method(razorpay.orders, 'create', async (input) => {
      dispatches += 1
      provider = {
        ...input,
        id: 'order_' + suffix.replaceAll('-', ''),
        amount_paid: 0,
        status: 'created',
      }
      return provider
    })
    t.mock.method(razorpay.orders, 'fetch', async () => provider)
    t.mock.method(razorpay.orders, 'fetchPayments', async () => ({ items: [] }))
    const nextInput = { ...args.p_checkout, checkout_request_id: randomUUID() }
    const prepared = await prepareCheckoutPayment(fixture.userId, nextInput)
    createdOrders.add(prepared.order_id)
    assert.equal(prepared.state, 'payable')
    assert.equal(prepared.can_pay, true)
    assert.equal(prepared.amount_paisa, 49900)
    assert.equal(prepared.snapshot.shipping.full_name, 'Checkout Test')
    const replay = await prepareCheckoutPayment(fixture.userId, nextInput)
    assert.equal(replay.order_id, prepared.order_id)
    assert.equal(dispatches, 1)
  }
)
