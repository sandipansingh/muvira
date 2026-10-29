const {
  paymentEnvironment,
  seedCheckoutPayment,
  finalizeCheckoutFixture,
} = require('./helpers/payment-environment.cjs')
require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const test = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  serviceClient,
  createOrderFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')
const {
  configureShippingFixture,
  checkoutShippingVerification,
  mockShippingProvider,
} = require('./helpers/shipping-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'attempt ownership and source versions isolate captures from edited and newer bags',
  { skip: !url || !key, timeout: 60000 },
  async (t) => {
    require('./helpers/test-env.cjs').configureTestEnvironment()
    const client = serviceClient(url, key)
    const fixture = await createOrderFixture(client)
    const restore = await configureShippingFixture(client)
    mockShippingProvider(t)
    const orderIds = []
    const suffix = randomUUID()
    const insert = async (table, values) => {
      const r = await client.from(table).insert(values).select().single()
      assert.ifError(r.error)
      return r.data
    }
    const category = await insert('categories', {
      name: 'Isolation test',
      slug: `isolation-${suffix}`,
    })
    const product = await insert('products', {
      name: 'Isolation test',
      slug: `isolation-${suffix}`,
      category_id: category.id,
      price_paisa: 10000,
      stock: 100,
      is_active: true,
    })
    const coupon = await insert('coupons', {
      code: `ISOLATION${suffix.replaceAll('-', '').toUpperCase()}`,
      discount_type: 'fixed',
      discount_value: 100,
      is_active: true,
    })
    const address = await insert('addresses', {
      user_id: fixture.userId,
      full_name: 'Isolation Test',
      phone: '9876543210',
      address_line1: 'Test lane',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700039',
      country: 'India',
    })
    t.after(async () => {
      for (const orderId of orderIds) await cleanupOrderFixture(client, { ...fixture, orderId })
      await cleanupOrderFixture(client, fixture)
      await client.from('products').delete().eq('id', product.id)
      await client.from('categories').delete().eq('id', category.id)
      await client.from('coupons').delete().eq('id', coupon.id)
      await restore()
    })
    const begin = async (id) => {
      const r = await client.rpc('begin_checkout_attempt', {
        p_user_id: fixture.userId,
        p_request_id: id,
      })
      assert.ifError(r.error)
      return r.data
    }
    const prepare = async (id) => {
      const checkout = {
        address_id: address.id,
        shipping_method: 'standard',
        billing_same_as_shipping: true,
      }
      const r = await client.rpc('prepare_checkout_payment', {
        ...paymentEnvironment(),
        p_user_id: fixture.userId,
        p_request_id: id,
        p_request_fingerprint: 'a'.repeat(64),
        p_checkout: checkout,
        p_order_prefix: 'TEST',
        p_shipping_verification: await checkoutShippingVerification(
          client,
          fixture.userId,
          checkout
        ),
      })
      assert.ifError(r.error)
      assert.ok(r.data.order_id)
      orderIds.push(r.data.order_id)
      const providerId = `order_${randomUUID().replaceAll('-', '')}`
      assert.ifError(
        (
          await seedCheckoutPayment(client, {
            p_user_id: fixture.userId,
            p_order_id: r.data.order_id,
            p_razorpay_order_id: providerId,
          })
        ).error
      )
      return { id: r.data.order_id, providerId }
    }
    const capture = async (order) => {
      const r = await finalizeCheckoutFixture(client, {
        p_razorpay_order_id: order.providerId,
        p_razorpay_payment_id: (order.paymentId ??= `pay_${randomUUID().replaceAll('-', '')}`),
        p_razorpay_signature: null,
        p_amount_paisa: order.amount || 10000,
        p_currency: 'INR',
        p_payment_method: 'upi',
      })
      assert.ifError(r.error)
      return r.data
    }
    const bag = async () => {
      const r = await client.from('cart_items').select('*').eq('user_id', fixture.userId)
      assert.ifError(r.error)
      return r.data
    }
    const row = await insert('cart_items', {
      user_id: fixture.userId,
      product_id: product.id,
      quantity: 1,
    })
    const oldAttempt = randomUUID()
    await begin(oldAttempt)
    const foreignAttempt = await client.rpc('begin_checkout_attempt', {
      p_user_id: randomUUID(),
      p_request_id: oldAttempt,
    })
    assert.equal(foreignAttempt.error?.code, 'P0002')
    const oldOrder = await prepare(oldAttempt)
    const nextAttempt = randomUUID()
    await begin(nextAttempt)
    await begin(oldAttempt)
    assert.equal(
      (await bag())[0].checkout_attempt_id,
      nextAttempt,
      'replay cannot reclaim newer bag'
    )
    await capture(oldOrder)
    assert.equal((await bag())[0].id, row.id, 'older capture before Review preserves bag')
    const nextOrder = await prepare(nextAttempt)
    assert.ifError((await client.from('cart_items').update({ quantity: 2 }).eq('id', row.id)).error)
    assert.ifError((await client.from('cart_items').update({ quantity: 1 }).eq('id', row.id)).error)
    await capture(nextOrder)
    assert.equal((await bag()).length, 1, 'edit and restore increments version')
    const thirdAttempt = randomUUID()
    await begin(thirdAttempt)
    const thirdOrder = await prepare(thirdAttempt)
    assert.ifError((await client.from('cart_items').delete().eq('id', row.id)).error)
    const replacement = await insert('cart_items', {
      user_id: fixture.userId,
      product_id: product.id,
      quantity: 1,
    })
    await capture(thirdOrder)
    assert.equal((await bag())[0].id, replacement.id, 'recreated row survives capture')
    const checkout = {
      address_id: address.id,
      shipping_method: 'standard',
      billing_same_as_shipping: true,
      coupon_code: coupon.code,
    }
    const legacy = await client.rpc('initialize_checkout_shipping', {
      p_user_id: fixture.userId,
      p_address_id: address.id,
      p_coupon_code: coupon.code,
      p_shipping_method: 'standard',
      p_billing_same_as_shipping: true,
      p_billing: null,
      p_notes: null,
      p_order_prefix: 'TEST',
      p_shipping_verification: await checkoutShippingVerification(client, fixture.userId, checkout),
    })
    assert.ifError(legacy.error)
    const legacyOrder = {
      id: legacy.data.order.id,
      amount: 9900,
      providerId: `order_${randomUUID().replaceAll('-', '')}`,
    }
    orderIds.push(legacyOrder.id)
    assert.ifError(
      (
        await seedCheckoutPayment(client, {
          p_user_id: fixture.userId,
          p_order_id: legacyOrder.id,
          p_razorpay_order_id: legacyOrder.providerId,
        })
      ).error
    )
    const sources = await client
      .from('order_cart_sources')
      .select('*')
      .eq('order_id', legacyOrder.id)
    assert.ifError(sources.error)
    assert.equal(
      sources.data[0].cart_item_id,
      replacement.id,
      'legacy initialization also records source identity'
    )
    assert.ifError(
      (await client.from('cart_items').update({ quantity: 1 }).eq('id', replacement.id)).error
    )
    const concurrentAttempt = randomUUID()
    await begin(concurrentAttempt)
    const { execFileSync } = require('node:child_process')
    const container = process.env.SUPABASE_TEST_DB_CONTAINER || 'supabase_db_muvira'
    const sql = (statement) =>
      execFileSync(
        'docker',
        [
          'exec',
          '-i',
          container,
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-At',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim()
    const pauseName = `test_capture_${suffix.replaceAll('-', '')}`
    sql(
      `CREATE FUNCTION public.${pauseName}() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(2); RETURN NEW; END $$; CREATE TRIGGER ${pauseName} AFTER UPDATE ON public.coupons FOR EACH ROW WHEN (NEW.id='${coupon.id}'::UUID) EXECUTE FUNCTION public.${pauseName}();`
    )
    t.after(() =>
      sql(
        `DROP TRIGGER IF EXISTS ${pauseName} ON public.coupons; DROP FUNCTION IF EXISTS public.${pauseName}();`
      )
    )
    const verification = await checkoutShippingVerification(client, fixture.userId, checkout)
    // Pause capture after it owns the coupon lock and overlap Review on the same coupon.
    const capturing = capture(legacyOrder)
    let sleeping = false
    for (let i = 0; i < 40; i++) {
      sleeping =
        sql(
          "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE '%finalize_checkout_payment%');"
        ) === 't'
      if (sleeping) break
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    assert.equal(sleeping, true, 'capture reached the coupon update barrier')
    const reviewing = client.rpc('prepare_checkout_payment', {
      ...paymentEnvironment(),
      p_user_id: fixture.userId,
      p_request_id: concurrentAttempt,
      p_request_fingerprint: 'a'.repeat(64),
      p_checkout: checkout,
      p_order_prefix: 'TEST',
      p_shipping_verification: verification,
    })
    const [, reviewed] = await Promise.all([capturing, reviewing])
    assert.notEqual(
      reviewed.error?.code,
      '40P01',
      'capture and Review must use a consistent lock order'
    )
    if (reviewed.data?.order_id) orderIds.push(reviewed.data.order_id)
    else assert.equal(reviewed.error?.code, 'P0409', 'changed coupon usage requires revalidation')
    sql(`DROP TRIGGER ${pauseName} ON public.coupons; DROP FUNCTION public.${pauseName}();`)
    assert.equal((await bag())[0].checkout_attempt_id, concurrentAttempt)
    const beforeMigration = await prepare(concurrentAttempt)
    assert.ifError(
      (await client.from('order_cart_sources').delete().eq('order_id', beforeMigration.id)).error
    )
    await capture(beforeMigration)
    assert.equal(
      (await bag())[0].id,
      replacement.id,
      'payments without source snapshots preserve current bag'
    )
    const lastAttempt = randomUUID()
    await begin(lastAttempt)
    const lastOrder = await prepare(lastAttempt)
    assert.equal((await capture(lastOrder)).already_captured, false)
    assert.equal((await bag()).length, 0, 'unchanged source row is consumed')
    assert.equal((await capture(lastOrder)).already_captured, true)
  }
)

test(
  'attempt schema readiness rejects ownership and source protection drift',
  { skip: !url || !key },
  () => {
    const { execFileSync } = require('node:child_process')
    const container = process.env.SUPABASE_TEST_DB_CONTAINER || 'supabase_db_muvira'
    for (const mutation of [
      'GRANT SELECT ON public.checkout_attempts TO anon;',
      'GRANT SELECT(request_id) ON public.checkout_attempts TO authenticated;',
      'GRANT UPDATE ON public.order_cart_sources TO authenticated;',
      'ALTER TABLE public.checkout_cart_owners DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.order_cart_sources DROP CONSTRAINT order_cart_sources_quantity_positive;',
      'ALTER TABLE public.cart_items DISABLE TRIGGER cart_items_checkout_version;',
      'REVOKE EXECUTE ON FUNCTION public.begin_checkout_attempt(UUID,UUID) FROM service_role;',
    ])
      execFileSync(
        'docker',
        [
          'exec',
          '-i',
          container,
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        {
          input: `BEGIN; ${mutation} DO $$ BEGIN IF (public.get_runtime_schema_status()->>'ready')::BOOLEAN THEN RAISE EXCEPTION 'Drift was not detected'; END IF; END $$; ROLLBACK;`,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      )
  }
)
