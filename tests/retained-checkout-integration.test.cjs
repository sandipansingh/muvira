const assert = require('node:assert/strict')
const test = require('node:test')
const {
  claimLease,
  cleanupOrderFixture,
  createOrderFixture,
  createPaymentFixture,
  serviceClient,
} = require('./helpers/provider-db-fixture.cjs')

const apiUrl = process.env.SUPABASE_TEST_URL
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

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
