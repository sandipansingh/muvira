require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { createClient } = require('./helpers/supabase-client.cjs')
const {
  claimLease,
  cleanupOrderFixture,
  createOrderFixture,
  createPaymentFixture,
  serviceClient,
} = require('./helpers/provider-db-fixture.cjs')

const apiUrl = process.env.SUPABASE_TEST_URL
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

async function reservedCheckout(client, context) {
  const order = await createOrderFixture(client, {
    status: 'pending',
    paymentStatus: 'pending',
    checkoutExpiresAt: new Date(Date.now() - 60_000).toISOString(),
  })
  const categoryId = crypto.randomUUID()
  const productId = crypto.randomUUID()
  const couponId = crypto.randomUUID()
  context.after(async () => {
    await cleanupOrderFixture(client, order)
    await client.from('operation_leases').delete().eq('resource_id', order.orderId)
    await client.from('products').delete().eq('id', productId)
    await client.from('coupons').delete().eq('id', couponId)
    await client.from('categories').delete().eq('id', categoryId)
  })
  const expiresAt = new Date(Date.now() - 60_000).toISOString()
  for (const [relation, values] of [
    ['categories', { id: categoryId, name: 'Expiry test', slug: categoryId }],
    [
      'products',
      {
        id: productId,
        category_id: categoryId,
        name: 'Reserved expiry test',
        slug: productId,
        price_paisa: 5000,
        stock: 3,
      },
    ],
    [
      'coupons',
      { id: couponId, code: couponId, discount_type: 'fixed', discount_value: 100, times_used: 0 },
    ],
    [
      'inventory_reservations',
      { order_id: order.orderId, product_id: productId, quantity: 2, expires_at: expiresAt },
    ],
    [
      'coupon_redemption_reservations',
      { order_id: order.orderId, coupon_id: couponId, expires_at: expiresAt },
    ],
  ])
    assert.ifError((await client.from(relation).insert(values)).error)
  return { ...order, productId, couponId }
}

async function checkoutSnapshot(client, order) {
  const results = await Promise.all([
    client.from('products').select('stock').eq('id', order.productId).single(),
    client.from('coupons').select('times_used').eq('id', order.couponId).single(),
    client
      .from('inventory_reservations')
      .select('status,released_at,committed_at')
      .eq('order_id', order.orderId)
      .single(),
    client
      .from('coupon_redemption_reservations')
      .select('status,released_at,committed_at')
      .eq('order_id', order.orderId)
      .single(),
    client.from('orders').select('status,payment_status').eq('id', order.orderId).single(),
    client
      .from('outbox_events')
      .select('id,event_type,deduplication_key')
      .eq('aggregate_id', order.orderId)
      .order('id'),
    client
      .from('order_status_history')
      .select('id,new_status')
      .eq('order_id', order.orderId)
      .order('id'),
  ])
  results.forEach((result) => assert.ifError(result.error))
  return results.map((result) => result.data)
}

test(
  'expiry commit survives a lost response and replay never repeats stock, coupon or notification effects',
  { skip: !apiUrl || !serviceRoleKey },
  async (context) => {
    const client = serviceClient(apiUrl, serviceRoleKey)
    for (const attached of [false, true]) {
      await context.test(
        attached ? 'provider-attached fenced expiry' : 'unattached expiry',
        async (t) => {
          const order = await reservedCheckout(client, t)
          if (attached)
            await createPaymentFixture(client, order, {
              status: 'created',
              razorpayPaymentId: null,
            })
          const lease = attached ? await claimLease(client, 'checkout_payment', order.orderId) : {}
          const rpc = attached ? 'fail_checkout_fenced' : 'expire_abandoned_checkouts'
          const args = attached
            ? { ...lease, p_order_id: order.orderId, p_reason: 'Provider confirms unpaid expiry' }
            : { p_limit: 100 }
          let dropped = false
          const lossyClient = createClient(apiUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: {
              fetch: async (input, init) => {
                const response = await fetch(input, init)
                if (!dropped && String(input).includes(`/rpc/${rpc}`)) {
                  assert.equal(response.ok, true)
                  await response.text()
                  dropped = true
                  throw new Error('Simulated response loss after expiry committed')
                }
                return response
              },
            },
          })
          const lost = await lossyClient.rpc(rpc, args)
          assert.equal(dropped, true)
          assert.ok(lost.error)
          const committed = await checkoutSnapshot(client, order)
          assert.equal(committed[0].stock, 5)
          assert.equal(committed[1].times_used, 0)
          assert.equal(committed[2].status, 'released')
          assert.equal(committed[3].status, 'released')
          assert.deepEqual(committed[4], { status: 'cancelled', payment_status: 'failed' })
          assert.deepEqual(
            committed[5].map((event) => event.event_type),
            ['order.payment_failed']
          )
          const replay = await client.rpc(rpc, args)
          assert.ifError(replay.error)
          if (!attached) assert.equal(replay.data, 0)
          assert.deepEqual(await checkoutSnapshot(client, order), committed)
        }
      )
    }
  }
)

test(
  'captured checkout keeps committed reservations when expiry replays and stale lease effects are fenced',
  { skip: !apiUrl || !serviceRoleKey },
  async (context) => {
    const client = serviceClient(apiUrl, serviceRoleKey)
    const order = await reservedCheckout(client, context)
    const payment = await createPaymentFixture(client, order, {
      status: 'created',
      razorpayPaymentId: null,
    })
    const staleLease = await claimLease(client, 'checkout_payment', order.orderId)
    assert.ifError(
      (
        await client
          .from('operation_leases')
          .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
          .eq('scope', 'checkout_payment')
          .eq('resource_id', order.orderId)
      ).error
    )
    const lease = await claimLease(client, 'checkout_payment', order.orderId)
    const captureArgs = {
      ...lease,
      p_razorpay_order_id: payment.razorpayOrderId,
      p_razorpay_payment_id: `pay_${crypto.randomUUID()}`,
      p_razorpay_signature: '',
      p_amount_paisa: order.amountPaisa,
      p_currency: 'INR',
      p_payment_method: 'upi',
    }
    const capture = await client.rpc('finalize_captured_payment_fenced', captureArgs)
    assert.ifError(capture.error)
    assert.equal(capture.data.already_captured, false)
    const committed = await checkoutSnapshot(client, order)
    assert.equal(committed[0].stock, 3)
    assert.equal(committed[1].times_used, 1)
    assert.equal(committed[2].status, 'committed')
    assert.equal(committed[3].status, 'committed')
    assert.deepEqual(committed[4], { status: 'confirmed', payment_status: 'paid' })
    assert.deepEqual(
      committed[5].map((event) => event.event_type),
      ['order.payment_captured']
    )
    const failArgs = { p_order_id: order.orderId, p_reason: 'Stale unpaid observation' }
    const stale = await client.rpc('fail_checkout_fenced', { ...staleLease, ...failArgs })
    assert.equal(stale.error?.code, '55P03')
    const expiry = await client.rpc('fail_checkout_fenced', { ...lease, ...failArgs })
    assert.ifError(expiry.error)
    assert.equal(expiry.data, false)
    const replay = await client.rpc('finalize_captured_payment_fenced', captureArgs)
    assert.ifError(replay.error)
    assert.equal(replay.data.already_captured, true)
    assert.deepEqual(await checkoutSnapshot(client, order), committed)
  }
)

test(
  'retained checkout count and fixed deadline are bounded before a late-capture watch opens',
  { skip: !apiUrl || !serviceRoleKey, timeout: 30_000 },
  async (context) => {
    const client = serviceClient(apiUrl, serviceRoleKey)
    const order = await createOrderFixture(client, {
      status: 'pending',
      paymentStatus: 'pending',
      checkoutExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    })
    await createPaymentFixture(client, order, { status: 'created', razorpayPaymentId: null })
    context.after(() => cleanupOrderFixture(client, order))
    const lease = await claimLease(client, 'checkout_payment', order.orderId, 300)
    const retainArgs = {
      ...lease,
      p_order_id: order.orderId,
      p_provider_status: 'created',
      p_provider_amount_paid: 0,
      p_provider_currency: 'INR',
      p_reason: 'Provider order remains payable',
    }

    for (let count = 1; count <= 96; count += 1) {
      const retained = await client.rpc('retain_payable_checkout_fenced', retainArgs)
      assert.ifError(retained.error)
      assert.equal(retained.data, true)
    }
    const bounded = await client.rpc('retain_payable_checkout_fenced', retainArgs)
    assert.ifError(bounded.error)
    assert.equal(bounded.data, false)
    const { data: retainedCase, error: caseError } = await client
      .from('retained_checkout_cases')
      .select('retention_started_at, retention_deadline_at, extension_count, escalation')
      .eq('order_id', order.orderId)
      .single()
    assert.ifError(caseError)
    assert.equal(retainedCase.extension_count, 96)
    assert.equal(retainedCase.escalation, 'critical')
    assert.equal(
      new Date(retainedCase.retention_deadline_at).getTime() -
        new Date(retainedCase.retention_started_at).getTime(),
      24 * 60 * 60 * 1_000
    )

    const startedAt = new Date(Date.now() - 25 * 60 * 60 * 1_000)
    const deadlineAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1_000)
    const { error: ageError } = await client
      .from('retained_checkout_cases')
      .update({
        retention_started_at: startedAt.toISOString(),
        retention_deadline_at: deadlineAt.toISOString(),
      })
      .eq('order_id', order.orderId)
    assert.ifError(ageError)
    const released = await client.rpc('release_retained_checkout_fenced', {
      ...lease,
      p_order_id: order.orderId,
      p_provider_status: 'provider_unavailable',
      p_provider_amount_paid: 0,
      p_provider_currency: 'INR',
      p_resolution_type: 'hard_deadline',
      p_reason: 'Hard deadline reached with an ambiguous provider outcome',
      p_actor_id: null,
    })
    assert.ifError(released.error)
    assert.equal(released.data.status, 'open')
    const { data: expiredOrder } = await client
      .from('orders')
      .select('status, payment_status')
      .eq('id', order.orderId)
      .single()
    assert.equal(expiredOrder.status, 'cancelled')
    assert.equal(expiredOrder.payment_status, 'failed')
  }
)
