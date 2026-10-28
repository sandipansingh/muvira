require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const test = require('node:test')
const { createClient } = require('./helpers/supabase-client.cjs')
const {
  createOrderFixture,
  cleanupOrderFixture,
  serviceClient,
  claimLease,
} = require('./helpers/provider-db-fixture.cjs')
const apiUrl = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const {
  configureShippingFixture,
  checkoutShippingVerification,
  mockShippingProvider,
} = require('./helpers/shipping-db-fixture.cjs')

test(
  'custom checkout preparation serializes concurrent requests and preserves dispatch uncertainty',
  { skip: !apiUrl || !key, timeout: 30000 },
  async (t) => {
    const client = serviceClient(apiUrl, key)
    require('./helpers/test-env.cjs').configureTestEnvironment()
    const restoreShipping = await configureShippingFixture(client)
    mockShippingProvider(t)
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
      await restoreShipping()
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
    args.p_shipping_verification = await checkoutShippingVerification(
      client,
      fixture.userId,
      args.p_checkout
    )
    await t.test(
      'shipping checks reject changed cart, address, package settings and product value before reservation',
      async () => {
        for (const [table, identifier, change, restore] of [
          [
            'addresses',
            address.id,
            { address_line1: 'Changed lane' },
            { address_line1: address.address_line1 },
          ],
          ['products', product.id, { weight_grams: 750 }, { weight_grams: product.weight_grams }],
          ['products', product.id, { price_paisa: 59900 }, { price_paisa: product.price_paisa }],
        ]) {
          assert.ifError((await client.from(table).update(change).eq('id', identifier)).error)
          const stale = await client.rpc('prepare_checkout_session_shipping', args)
          assert.equal(stale.error?.code, '40001', `${table} change must invalidate delivery check`)
          assert.ifError((await client.from(table).update(restore).eq('id', identifier)).error)
        }
        assert.ifError(
          (await client.from('cart_items').update({ quantity: 2 }).eq('user_id', fixture.userId))
            .error
        )
        assert.equal(
          (await client.rpc('prepare_checkout_session_shipping', args)).error?.code,
          '40001'
        )
        assert.ifError(
          (await client.from('cart_items').update({ quantity: 1 }).eq('user_id', fixture.userId))
            .error
        )
        const { data: settings } = await client
          .from('site_settings')
          .select('value')
          .eq('key', 'shiprocket_settings')
          .single()
        assert.ifError(
          (
            await client
              .from('site_settings')
              .update({ value: { ...settings.value, default_weight_grams: 750 } })
              .eq('key', 'shiprocket_settings')
          ).error
        )
        assert.equal(
          (await client.rpc('prepare_checkout_session_shipping', args)).error?.code,
          '40001'
        )
        assert.ifError(
          (
            await client
              .from('site_settings')
              .update({ value: settings.value })
              .eq('key', 'shiprocket_settings')
          ).error
        )
        const { count, error } = await client
          .from('checkout_preparations')
          .select('request_id', { count: 'exact', head: true })
          .eq('request_id', args.p_request_id)
        assert.ifError(error)
        assert.equal(count, 0)
        const unavailable = await client.rpc('prepare_checkout_session_shipping', {
          ...args,
          p_shipping_verification: {
            ...args.p_shipping_verification,
            availability: { ...args.p_shipping_verification.availability, available: false },
          },
        })
        assert.equal(unavailable.error?.code, '22023')
      }
    )
    args.p_shipping_verification = await checkoutShippingVerification(
      client,
      fixture.userId,
      args.p_checkout
    )
    const [first, second] = await Promise.all([
      client.rpc('prepare_checkout_session_shipping', args),
      client.rpc('prepare_checkout_session_shipping', args),
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
    const changed = await client.rpc('prepare_checkout_session_shipping', {
      ...args,
      p_request_fingerprint: 'b'.repeat(64),
    })
    assert.equal(changed.data.conflict, 'CHECKOUT_REQUEST_CONFLICT')
    const replacement = await client.rpc('prepare_checkout_session_shipping', {
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
    assert.ok((await anonymous.from('order_shipping_snapshots').select('*')).error)
    assert.ok((await anonymous.rpc('active_checkout_ids', { p_user_id: fixture.userId })).error)
    const ready = await client.rpc('get_runtime_schema_status')
    assert.ifError(ready.error)
    assert.equal(
      ready.data.contract_version,
      require('./helpers/schema-version.cjs').latestSchemaVersion
    )
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
    assert.equal(
      (await client.rpc('prepare_checkout_session_shipping', args)).data.order_id,
      orderId
    )

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
    const shippingProvider = require('../server/dist/services/shiprocket.js')
    shippingProvider.checkServiceability = async () => {
      throw new Error('provider unavailable after preparation')
    }
    assert.ifError(
      (
        await client
          .from('addresses')
          .update({ full_name: 'Changed after preparation' })
          .eq('id', address.id)
      ).error
    )
    assert.ifError(
      (await client.from('cart_items').update({ quantity: 2 }).eq('user_id', fixture.userId)).error
    )
    const replay = await prepareCheckoutPayment(fixture.userId, nextInput)
    assert.equal(replay.order_id, prepared.order_id)
    assert.equal(dispatches, 1)
    assert.equal(replay.snapshot.shipping.full_name, 'Checkout Test')
    assert.equal(replay.amount_paisa, 49900)
  }
)

test(
  'captured multi-quantity checkout keeps its frozen package through normal admin courier selection',
  { skip: !apiUrl || !key, timeout: 30000 },
  async (t) => {
    require('./helpers/test-env.cjs').configureTestEnvironment()
    const client = serviceClient(apiUrl, key)
    const restoreShipping = await configureShippingFixture(client)
    const fixture = await createOrderFixture(client)
    const suffix = randomUUID()
    let checkoutOrderId
    let categoryId
    let productIds = []
    t.after(async () => {
      if (checkoutOrderId)
        await cleanupOrderFixture(client, { ...fixture, orderId: checkoutOrderId })
      await cleanupOrderFixture(client, fixture)
      if (productIds.length) await client.from('products').delete().in('id', productIds)
      if (categoryId) await client.from('categories').delete().eq('id', categoryId)
      await restoreShipping()
    })
    const insert = async (table, values) => {
      const result = await client.from(table).insert(values).select().single()
      assert.ifError(result.error)
      return result.data
    }
    const category = await insert('categories', {
      name: 'Frozen package test',
      slug: `frozen-${suffix}`,
    })
    categoryId = category.id
    const first = await insert('products', {
      name: '500g product',
      slug: `frozen-first-${suffix}`,
      category_id: category.id,
      price_paisa: 10000,
      weight_grams: 500,
      stock: 20,
      is_active: true,
    })
    const second = await insert('products', {
      name: '250g product',
      slug: `frozen-second-${suffix}`,
      category_id: category.id,
      price_paisa: 5000,
      weight_grams: 250,
      stock: 20,
      is_active: true,
    })
    productIds = [first.id, second.id]
    const address = await insert('addresses', {
      user_id: fixture.userId,
      full_name: 'Package Test',
      phone: '9876543210',
      address_line1: 'Test lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
    })
    assert.ifError(
      (
        await client.from('cart_items').insert([
          { user_id: fixture.userId, product_id: first.id, quantity: 3 },
          { user_id: fixture.userId, product_id: second.id, quantity: 2 },
        ])
      ).error
    )
    const { data: config } = await client
      .from('site_settings')
      .select('value')
      .eq('key', 'shiprocket_settings')
      .single()
    assert.ifError(
      (
        await client
          .from('site_settings')
          .update({ value: { ...config.value, default_weight_grams: 900 } })
          .eq('key', 'shiprocket_settings')
      ).error
    )
    mockShippingProvider(t)
    const { razorpay } = require('../server/dist/lib/razorpay/client.js')
    t.mock.method(razorpay.orders, 'create', async (input) => ({
      ...input,
      id: `order_${suffix.replaceAll('-', '')}`,
      currency: 'INR',
      status: 'created',
    }))
    const { prepareCheckoutPayment } = require('../server/dist/modules/checkout/session.js')
    const prepared = await prepareCheckoutPayment(fixture.userId, {
      checkout_request_id: randomUUID(),
      address_id: address.id,
      shipping_method: 'standard',
      billing_same_as_shipping: true,
    })
    checkoutOrderId = prepared.order_id
    assert.equal(prepared.amount_paisa, 40000)
    const captured = await client.rpc('finalize_captured_payment', {
      p_razorpay_order_id: prepared.razorpay_order_id,
      p_razorpay_payment_id: `pay_${suffix.replaceAll('-', '')}`,
      p_razorpay_signature: null,
      p_amount_paisa: 40000,
      p_currency: 'INR',
      p_payment_method: 'upi',
    })
    assert.ifError(captured.error)
    assert.equal(captured.data.order.payment_status, 'paid')
    assert.ifError(
      (
        await client
          .from('site_settings')
          .update({ value: { ...config.value, default_weight_grams: 500, default_length_cm: 99 } })
          .eq('key', 'shiprocket_settings')
      ).error
    )
    assert.ifError(
      (await client.from('products').update({ weight_grams: 100 }).in('id', productIds)).error
    )
    const {
      adminGetOrder,
      adminOrderCouriers,
    } = require('../server/dist/modules/orders/service.js')
    const order = await adminGetOrder(checkoutOrderId)
    assert.equal(order.package_weight_grams, 2000)
    assert.equal(order.package_length_cm, 15)
    assert.equal(order.pickup_location, 'Registered fixture')
    assert.equal('context' in order, false)
    assert.equal('verification' in order, false)
    const provider = require('../server/dist/services/shiprocket.js')
    let requested
    provider.checkServiceability = async (input) => {
      requested = input
      return {
        available_courier: [
          {
            courier_id: 1,
            courier_name: 'Fixture courier',
            rate_paisa: 5000,
            estimated_delivery_days: 3,
            cod: false,
          },
        ],
      }
    }
    await adminOrderCouriers(checkoutOrderId, {
      pickupLocation: order.pickup_location,
      weightGrams: order.package_weight_grams,
      lengthCm: order.package_length_cm,
      breadthCm: order.package_breadth_cm,
      heightCm: order.package_height_cm,
    })
    assert.equal(requested.weight_grams, 2000)
    assert.equal(requested.length_cm, 15)
    assert.equal(requested.declared_value_paisa, 40000)
  }
)
