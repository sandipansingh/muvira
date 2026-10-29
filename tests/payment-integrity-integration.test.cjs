require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const test = require('node:test')
const crypto = require('node:crypto')
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
  claimLease,
} = require('./helpers/provider-db-fixture.cjs')
const enabled = !!process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const environment = { p_provider_mode: 'test', p_provider_key_id: 'rzp_test_example' }

test(
  'wide pricing preserves percentage rounding and retained coupon capacity until release',
  { skip: !enabled },
  async (t) => {
    const client = serviceClient(
      process.env.SUPABASE_TEST_URL,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
    )
    const {
      configureShippingFixture,
      checkoutShippingVerification,
    } = require('./helpers/shipping-db-fixture.cjs')
    const restore = await configureShippingFixture(client)
    const fixtures = [await createOrderFixture(client), await createOrderFixture(client)]
    const orders = []
    const insert = async (table, data) => {
      const result = await client.from(table).insert(data).select().single()
      assert.ifError(result.error)
      return result.data
    }
    const category = await insert('categories', {
      name: 'Payment integrity',
      slug: crypto.randomUUID(),
    })
    const product = await insert('products', {
      name: 'Wide pricing',
      slug: crypto.randomUUID(),
      category_id: category.id,
      price_paisa: 50000000,
      stock: 10,
      is_active: true,
    })
    const coupon = await insert('coupons', {
      code: 'BOUND' + crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(),
      discount_type: 'percentage',
      discount_value: 50,
      max_uses: 1,
      is_active: true,
    })
    t.after(async () => {
      for (const id of orders)
        await cleanupOrderFixture(client, { ...fixtures[0], orderId: id, userId: undefined })
      for (const fixture of fixtures) await cleanupOrderFixture(client, fixture)
      await client.from('products').delete().eq('id', product.id)
      await client.from('coupons').delete().eq('id', coupon.id)
      await client.from('categories').delete().eq('id', category.id)
      await restore()
    })
    const addresses = []
    for (const fixture of fixtures) {
      addresses.push(
        await insert('addresses', {
          user_id: fixture.userId,
          full_name: 'Integrity test',
          phone: '9876543210',
          address_line1: 'Test lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
        })
      )
      await insert('cart_items', { user_id: fixture.userId, product_id: product.id, quantity: 1 })
    }
    const prepare = async (index, couponCode = coupon.code) => {
      const checkout = {
        address_id: addresses[index].id,
        shipping_method: 'standard',
        billing_same_as_shipping: true,
        ...(couponCode ? { coupon_code: couponCode } : {}),
      }
      return client.rpc('prepare_checkout_payment', {
        ...environment,
        p_user_id: fixtures[index].userId,
        p_request_id: crypto.randomUUID(),
        p_request_fingerprint: crypto.randomBytes(32).toString('hex'),
        p_checkout: checkout,
        p_order_prefix: 'TEST',
        p_shipping_verification: await checkoutShippingVerification(
          client,
          fixtures[index].userId,
          checkout
        ),
      })
    }
    const first = await prepare(0)
    assert.ifError(first.error)
    orders.push(first.data.order_id)
    const order = await client
      .from('orders')
      .select('subtotal_paisa,discount_amount_paisa,total_amount_paisa')
      .eq('id', first.data.order_id)
      .single()
    assert.deepEqual(order.data, {
      subtotal_paisa: 50000000,
      discount_amount_paisa: 25000000,
      total_amount_paisa: 25000000,
    })
    assert.ifError(
      (
        await client
          .from('coupon_redemption_reservations')
          .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
          .eq('order_id', first.data.order_id)
      ).error
    )
    const exhausted = await prepare(1)
    assert.equal(exhausted.error?.code, 'P0001')
    await client.from('products').update({ price_paisa: 2147483647 }).eq('id', product.id)
    await client.from('cart_items').update({ quantity: 2 }).eq('user_id', fixtures[1].userId)
    const overflow = await prepare(1, null)
    assert.equal(overflow.error?.code, '22023')
    assert.equal(
      (
        await client
          .from('orders')
          .select('id')
          .eq('user_id', fixtures[1].userId)
          .eq('status', 'pending')
      ).data.length,
      0
    )
  }
)

test(
  'payment environment and duplicate finalization reject substituted identities',
  { skip: !enabled },
  async () => {
    const client = serviceClient(
      process.env.SUPABASE_TEST_URL,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
    )
    const order = await createOrderFixture(client, { providerMode: null })
    try {
      const payment = await createPaymentFixture(client, order)
      const binding = await client
        .from('razorpay_order_bindings')
        .insert({ order_id: order.orderId, mode: 'test', key_id: 'rzp_test_example' })
      assert.ifError(binding.error)
      assert.ifError(
        (
          await client.rpc('assert_razorpay_order_environment', {
            p_order_id: order.orderId,
            ...environment,
          })
        ).error
      )
      assert.ok(
        (
          await client.rpc('assert_razorpay_order_environment', {
            p_order_id: order.orderId,
            p_provider_mode: 'live',
            p_provider_key_id: 'rzp_live_different',
          })
        ).error
      )
      const lease = await claimLease(client, 'checkout_payment', order.orderId)
      const input = {
        ...lease,
        ...environment,
        p_razorpay_order_id: payment.razorpayOrderId,
        p_razorpay_payment_id: payment.razorpayPaymentId,
        p_razorpay_signature: '',
        p_amount_paisa: order.amountPaisa,
        p_currency: 'INR',
        p_payment_method: 'card',
      }
      const duplicate = await client.rpc('finalize_checkout_payment', input)
      assert.ifError(duplicate.error)
      assert.equal(duplicate.data.already_captured, true)
      for (const change of [
        { p_razorpay_payment_id: 'pay_substituted' },
        { p_amount_paisa: 1 },
        { p_currency: 'USD' },
        { p_payment_method: 'unknown' },
        { p_execution_resource_id: crypto.randomUUID() },
        { p_provider_key_id: 'rzp_test_different' },
      ])
        assert.ok(
          (await client.rpc('finalize_checkout_payment', { ...input, ...change })).error,
          JSON.stringify(change)
        )
    } finally {
      await cleanupOrderFixture(client, order)
    }
  }
)

test(
  'verified webhook receipt and recovery work survive without processing',
  { skip: !enabled },
  async () => {
    const client = serviceClient(
      process.env.SUPABASE_TEST_URL,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
    )
    const id = crypto.randomUUID()
    const input = {
      p_event_id: id,
      p_event_type: 'unsupported',
      p_payload_hash: 'a'.repeat(64),
      p_payload: { event: 'unsupported' },
    }
    const receipt = await client.rpc('ingest_razorpay_webhook', input)
    assert.ifError(receipt.error)
    try {
      const job = await client
        .from('retry_jobs')
        .select('id')
        .eq('job_type', 'razorpay_webhook')
        .eq('reference_id', receipt.data.id)
      assert.ifError(job.error)
      assert.equal(job.data.length, 1)
      const duplicate = await client.rpc('ingest_razorpay_webhook', input)
      assert.ifError(duplicate.error)
      assert.equal(duplicate.data.id, receipt.data.id)
      assert.ok(
        (await client.rpc('ingest_razorpay_webhook', { ...input, p_payload_hash: 'b'.repeat(64) }))
          .error
      )
      await client.from('retry_jobs').delete().eq('reference_id', receipt.data.id)
      assert.ifError((await client.rpc('recover_razorpay_webhook_receipts', { p_limit: 10 })).error)
      assert.equal(
        (await client.from('retry_jobs').select('id').eq('reference_id', receipt.data.id)).data
          .length,
        1
      )
    } finally {
      await client.from('retry_jobs').delete().eq('reference_id', receipt.data.id)
      await client.from('webhook_events').delete().eq('id', receipt.data.id)
    }
  }
)
