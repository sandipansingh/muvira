require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
require('./helpers/test-env.cjs').configureTestEnvironment()
const assert = require('node:assert/strict')
const test = require('node:test')
const crypto = require('node:crypto')
const { once } = require('node:events')
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const enabled = Boolean(url && key)

async function report(client, period = 'week', now = '2032-03-01T06:30:00Z') {
  const response = await client.rpc('get_dashboard_analytics', { p_period: period, p_now: now })
  assert.ifError(response.error)
  return response.data
}

async function insertRefund(client, order, payment, input = {}) {
  const identity = crypto.randomUUID()
  const { error } = await client.from('provider_operations').insert({
    provider: 'razorpay',
    operation_type: 'partial_refund',
    business_key: identity,
    order_id: order.orderId,
    payment_id: payment.paymentId,
    provider_target_type: 'payment',
    provider_target_id: payment.razorpayPaymentId,
    amount_paisa: 20000,
    currency: 'INR',
    request_hash: 'a'.repeat(64),
    idempotency_key: identity,
    cause: 'Reporting fixture',
    state: 'provider_succeeded',
    provider_operation_id: 'rfnd_' + identity,
    provider_completed_at: '2032-02-29T18:30:00Z',
    ...input,
  })
  assert.ifError(error)
}

test(
  'net collections use distinct confirmed money movements, including fully refunded captures and local-pending refunds',
  { skip: !enabled },
  async (t) => {
    const client = serviceClient(url, key)
    const order = await createOrderFixture(client, { amountPaisa: 100000 })
    const full = await createOrderFixture(client, { amountPaisa: 25000 })
    t.after(async () => {
      await cleanupOrderFixture(client, full)
      await cleanupOrderFixture(client, order)
    })
    for (const item of [order, full])
      assert.ifError(
        (
          await client
            .from('orders')
            .update({ created_at: '2032-02-28T00:00:00Z' })
            .eq('id', item.orderId)
        ).error
      )
    const payment = await createPaymentFixture(client, order)
    const refunded = await createPaymentFixture(client, full)
    assert.ifError(
      (
        await client
          .from('payments')
          .update({ captured_at: '2032-02-29T18:29:59Z' })
          .eq('id', payment.paymentId)
      ).error
    )
    assert.ifError(
      (
        await client
          .from('payments')
          .update({
            captured_at: '2032-02-27T18:30:00Z',
            status: 'refunded',
            refunded_amount_paisa: 25000,
          })
          .eq('id', refunded.paymentId)
      ).error
    )
    const refundId = 'rfnd_' + crypto.randomUUID()
    await insertRefund(client, order, payment, { provider_operation_id: refundId })
    await insertRefund(client, order, payment, { provider_operation_id: refundId })
    await insertRefund(client, order, payment, {
      state: 'provider_pending',
      provider_completed_at: null,
    })
    await insertRefund(client, order, payment, { state: 'provider_failed' })
    await insertRefund(client, full, refunded, {
      operation_type: 'full_refund',
      amount_paisa: 25000,
      provider_completed_at: '2032-02-28T18:30:00Z',
      local_applied_at: '2032-02-28T18:30:01Z',
    })
    const week = await report(client)
    assert.deepEqual(week.summary, {
      collected_paisa: 125000,
      refunded_paisa: 45000,
      net_paisa: 80000,
      orders_placed: 2,
    })
    assert.equal(week.buckets.length, 7)
    assert.equal(
      week.buckets.reduce((sum, bucket) => sum + bucket.net_paisa, 0),
      80000
    )
    const day = await report(client, 'day')
    assert.equal(day.summary.net_paisa, -20000)
    assert.equal(day.summary.collected_paisa, 0)
    assert.equal(day.buckets[0].refunded_paisa, 20000)
    assert.equal(day.buckets.length, 12)
    assert.equal(day.start_at, '2032-02-29T18:30:00+00:00')
    assert.equal(day.timezone, 'Asia/Kolkata')
    assert.equal(day.data_quality.incomplete, false)
    assert.equal(week.previous.summary.net_paisa, 0)
  }
)

test(
  'analytics aggregates past row limits and flags unplaceable confirmed events instead of guessing timestamps',
  { skip: !enabled },
  async (t) => {
    const client = serviceClient(url, key)
    const order = await createOrderFixture(client)
    const prefix = 'report_' + crypto.randomUUID()
    t.after(async () => {
      await client
        .from('payments')
        .delete()
        .like('razorpay_order_id', prefix + '%')
      await client.from('orders').delete().eq('user_id', order.userId).neq('id', order.orderId)
      await cleanupOrderFixture(client, order)
    })
    const payment = await createPaymentFixture(client, order)
    assert.ifError(
      (
        await client
          .from('payments')
          .update({ captured_at: null, refunded_amount_paisa: 123 })
          .eq('id', payment.paymentId)
      ).error
    )
    const template = (
      await client.from('payments').select('*').eq('id', payment.paymentId).single()
    ).data
    const orderTemplate = (await client.from('orders').select('*').eq('id', order.orderId).single())
      .data
    const ids = Array.from({ length: 1001 }, () => crypto.randomUUID())
    assert.ifError(
      (
        await client.from('orders').insert(
          ids.map((id, i) => ({
            ...orderTemplate,
            id,
            order_number: prefix + i,
            subtotal_paisa: 100,
            total_amount_paisa: 100,
            created_at: '2033-01-01T00:00:00Z',
          }))
        )
      ).error
    )
    assert.ifError(
      (
        await client.from('payments').insert(
          ids.map((id, i) => ({
            ...template,
            id: crypto.randomUUID(),
            order_id: id,
            razorpay_order_id: prefix + i,
            razorpay_payment_id: 'pay_' + crypto.randomUUID(),
            refunded_amount_paisa: 0,
            amount_paisa: 100,
            captured_at: '2033-01-01T00:00:00Z',
          }))
        )
      ).error
    )
    const result = await report(client, 'day', '2033-01-01T06:30:00Z')
    assert.equal(result.summary.collected_paisa, 100100)
    assert.equal(result.data_quality.incomplete, true)
    assert.ok(result.data_quality.missing_capture_timestamps >= 1)
    assert.ok(result.data_quality.unattributed_refunds_paisa >= 123)
    assert.ok((await client.rpc('get_dashboard_analytics', { p_period: 'invalid' })).error)
    const anon = serviceClient(url, process.env.SUPABASE_TEST_ANON_KEY)
    assert.ok((await anon.rpc('get_dashboard_analytics')).error)
  }
)

test(
  'analytics range boundaries use local dates, leap days and comparable partial periods',
  { skip: !enabled },
  async () => {
    const client = serviceClient(url, key)
    const month = await report(client, 'month')
    assert.equal(month.buckets.length, 30)
    assert.equal(Date.parse(month.start_at), Date.parse('2032-01-31T18:30:00Z'))
    const year = await report(client, 'year')
    assert.equal(year.buckets.length, 12)
    assert.equal(Date.parse(year.start_at), Date.parse('2031-03-31T18:30:00Z'))
    assert.equal(Date.parse(year.previous.end_at), Date.parse('2031-03-01T06:30:00Z'))
    assert.equal(year.currency, 'INR')
    assert.ok(year.buckets.every((bucket) => Date.parse(bucket.start_at) < Date.parse(year.as_of)))
  }
)

test(
  'analytics HTTP endpoint requires admin access and validates period',
  { skip: !enabled },
  async (t) => {
    const client = serviceClient(url, key)
    const identity = await createOrderFixture(client)
    t.after(() => cleanupOrderFixture(client, identity))
    const password = 'Test-' + crypto.randomUUID() + '-9a!'
    assert.ifError((await client.auth.admin.updateUserById(identity.userId, { password })).error)
    const auth = serviceClient(url, process.env.SUPABASE_TEST_ANON_KEY)
    const signed = await auth.auth.signInWithPassword({ email: identity.email, password })
    assert.ifError(signed.error)
    const { createApp } = require('../server/dist/app.js')
    const server = createApp().listen(0)
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const endpoint = `http://127.0.0.1:${server.address().port}/api/admin/dashboard/analytics`
    assert.equal((await fetch(endpoint)).status, 401)
    const headers = { authorization: `Bearer ${signed.data.session.access_token}` }
    assert.equal((await fetch(endpoint, { headers })).status, 403)
    assert.ok((await auth.rpc('get_dashboard_analytics')).error)
    assert.ifError(
      (await client.from('profiles').update({ role: 'admin' }).eq('id', identity.userId)).error
    )
    assert.equal((await fetch(endpoint + '?period=invalid', { headers })).status, 400)
    const response = await fetch(endpoint, { headers })
    const contract = await client.rpc('get_runtime_schema_status')
    assert.ifError(contract.error)
    if (contract.data.contract_version < 57) {
      assert.equal(response.status, 503)
      assert.equal((await response.json()).error.code, 'SCHEMA_UPGRADE_REQUIRED')
    } else {
      assert.equal(response.status, 200)
      assert.equal((await response.json()).data.period, 'week')
    }
  }
)

test(
  'analytics exclude failed collections, foreign currency and conflicting or undated refunds visibly',
  { skip: !enabled },
  async (t) => {
    const client = serviceClient(url, key)
    const orders = []
    t.after(async () => {
      for (const order of orders) await cleanupOrderFixture(client, order)
    })
    for (const state of ['failed', 'foreign', 'captured']) {
      const order = await createOrderFixture(client)
      orders.push(order)
      const payment = await createPaymentFixture(client, order)
      assert.ifError(
        (
          await client
            .from('payments')
            .update({
              captured_at: '2034-04-01T00:00:00Z',
              status: state === 'failed' ? 'failed' : 'captured',
              currency: state === 'foreign' ? 'USD' : 'INR',
            })
            .eq('id', payment.paymentId)
        ).error
      )
      if (state === 'captured') {
        const refundId = 'rfnd_conflict_' + crypto.randomUUID()
        await insertRefund(client, order, payment, {
          provider_operation_id: refundId,
          amount_paisa: 1000,
          provider_completed_at: '2034-04-01T01:00:00Z',
        })
        await insertRefund(client, order, payment, {
          provider_operation_id: refundId,
          amount_paisa: 2000,
          provider_completed_at: '2034-04-01T01:00:00Z',
        })
        await insertRefund(client, order, payment, {
          provider_operation_id: null,
          amount_paisa: 1000,
          provider_completed_at: null,
        })
      }
    }
    const data = await report(client, 'day', '2034-04-01T06:30:00Z')
    assert.equal(data.summary.collected_paisa, 10000)
    assert.equal(data.summary.refunded_paisa, 0)
    assert.equal(data.data_quality.invalid_refund_events, 3)
    assert.ok(data.data_quality.excluded_currency_events >= 1)
    assert.equal(data.data_quality.incomplete, true)
    assert.ok((await client.rpc('get_dashboard_analytics', { p_now: 'infinity' })).error)
  }
)
