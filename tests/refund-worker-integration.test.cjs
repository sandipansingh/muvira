const { paymentEnvironment } = require('./helpers/payment-environment.cjs')
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
const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
require('./helpers/test-env.cjs').configureTestEnvironment()

test(
  'a stalled provider observation times out and schedules failure backoff',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key),
      fixture = await createOrderFixture(client, { status: 'cancelled', paymentStatus: 'failed' })
    const payment = await createPaymentFixture(client, fixture, {
      status: 'created',
      razorpayPaymentId: null,
    })
    t.after(() => cleanupOrderFixture(client, fixture))
    assert.ifError(
      (
        await client.from('late_capture_watches').insert({
          order_id: fixture.orderId,
          payment_id: payment.paymentId,
          razorpay_order_id: payment.razorpayOrderId,
          expected_amount_paisa: fixture.amountPaisa,
          currency: 'INR',
          reason: 'Slow provider fixture',
        })
      ).error
    )
    const { razorpay } = require('../server/dist/lib/razorpay/client.js')
    const originalFetch = razorpay.orders.fetch,
      originalTimer = global.setTimeout
    t.after(() => {
      razorpay.orders.fetch = originalFetch
      global.setTimeout = originalTimer
    })
    global.setTimeout = (callback, delay, ...args) =>
      originalTimer(callback, delay === 20000 ? 5 : delay, ...args)
    razorpay.orders.fetch = (id) =>
      new Promise((resolve) =>
        originalTimer(
          () => resolve({ id, amount: fixture.amountPaisa, currency: 'INR', status: 'created' }),
          100
        )
      )
    await require('../server/dist/services/providerOperations.js').processLateCaptureWatches()
    const watch = (
      await client
        .from('late_capture_watches')
        .select('failed_checks,last_check_error,next_check_at')
        .eq('order_id', fixture.orderId)
        .single()
    ).data
    assert.equal(watch.failed_checks, 1)
    assert.match(watch.last_check_error, /timed out/)
    assert.ok(new Date(watch.next_check_at) > new Date(Date.now() + 50000))
  }
)

test(
  'remaining refund waits for reservations, then refunds only the balance with stable replay',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key)
    const fixture = await createOrderFixture(client)
    const payment = await createPaymentFixture(client, fixture)
    t.after(() => cleanupOrderFixture(client, fixture))
    const { data: partial, error } = await client.rpc('prepare_provider_operation', {
      p_provider: 'razorpay',
      p_operation_type: 'partial_refund',
      p_business_key: crypto.randomUUID(),
      p_order_id: fixture.orderId,
      p_payment_id: payment.paymentId,
      p_provider_target_type: 'payment',
      p_provider_target_id: payment.razorpayPaymentId,
      p_amount_paisa: 2500,
      p_currency: 'INR',
      p_request_hash: 'a'.repeat(64),
      p_cause: 'Partial refund',
    })
    assert.ifError(error)
    const request = {
      p_order_id: fixture.orderId,
      p_cause: 'Refund remaining balance',
      p_cancellation_operation_id: null,
    }
    const waiting = await client.rpc('prepare_remaining_refund', request)
    assert.ifError(waiting.error)
    assert.equal(waiting.data.status, 'waiting')
    const lease = await claimLease(client, 'provider_operation', partial.id)
    assert.ifError(
      (
        await client.rpc('claim_razorpay_refund_dispatch', {
          ...paymentEnvironment(),
          ...lease,
          p_operation_id: partial.id,
        })
      ).error
    )
    assert.ifError(
      (
        await client.rpc('record_provider_operation_result', {
          ...lease,
          p_operation_id: partial.id,
          p_state: 'provider_succeeded',
          p_provider_operation_id: 'rfnd_partial',
          p_provider_status: 'processed',
          p_response_metadata: {},
          p_error_classification: null,
          p_manual_review_reason: null,
        })
      ).error
    )
    assert.ifError(
      (
        await client.rpc('finalize_razorpay_refund', {
          ...paymentEnvironment(),
          ...lease,
          p_operation_id: partial.id,
          p_provider_target_type: 'payment',
          p_provider_target_id: payment.razorpayPaymentId,
          p_payment_id: payment.paymentId,
          p_amount_paisa: 2500,
          p_currency: 'INR',
          p_request_hash: 'a'.repeat(64),
        })
      ).error
    )
    const results = await Promise.all([
      client.rpc('prepare_remaining_refund', request),
      client.rpc('prepare_remaining_refund', request),
    ])
    for (const result of results) {
      assert.ifError(result.error)
      assert.equal(result.data.operation.amount_paisa, 7500)
    }
    assert.equal(results[0].data.operation.id, results[1].data.operation.id)
    assert.ok(
      (await client.rpc('prepare_remaining_refund', { ...request, p_cause: 'Different reason' }))
        .error
    )
  }
)

test(
  '21 due watches process the newer paid order after 20 unpaid observations',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key)
    const fixtures = []
    t.after(async () => {
      for (const fixture of fixtures) await cleanupOrderFixture(client, fixture)
    })
    for (let i = 0; i < 21; i++) {
      const fixture = await createOrderFixture(client, {
        status: 'cancelled',
        paymentStatus: 'failed',
      })
      fixtures.push(fixture)
      fixture.payment = await createPaymentFixture(client, fixture, {
        status: 'created',
        razorpayPaymentId: null,
      })
      assert.ifError(
        (
          await client.from('late_capture_watches').insert({
            order_id: fixture.orderId,
            payment_id: fixture.payment.paymentId,
            razorpay_order_id: fixture.payment.razorpayOrderId,
            expected_amount_paisa: fixture.amountPaisa,
            currency: 'INR',
            reason: 'Fairness fixture',
            next_check_at: new Date(Date.now() - 60_000 + i).toISOString(),
          })
        ).error
      )
    }
    const { razorpay } = require('../server/dist/lib/razorpay/client.js')
    const service = require('../server/dist/services/providerOperations.js')
    require('../server/dist/services/runtimeSchema.js').clearRuntimeSchemaStatusCache()
    const originalFetch = razorpay.orders.fetch,
      originalPayments = razorpay.orders.fetchPayments,
      originalRefund = razorpay.payments.refund
    t.after(() => {
      razorpay.orders.fetch = originalFetch
      razorpay.orders.fetchPayments = originalPayments
      razorpay.payments.refund = originalRefund
    })
    const paid = fixtures[20],
      observed = [],
      refunds = []
    razorpay.orders.fetch = async (id) => {
      observed.push(id)
      return {
        id,
        amount: 10000,
        currency: 'INR',
        status: id === paid.payment.razorpayOrderId ? 'paid' : 'created',
        amount_paid: id === paid.payment.razorpayOrderId ? 10000 : 0,
      }
    }
    razorpay.orders.fetchPayments = async (id) => ({
      items: [
        {
          id: 'pay_fairness',
          order_id: id,
          status: 'captured',
          captured: true,
          amount: 10000,
          currency: 'INR',
        },
      ],
    })
    razorpay.payments.refund = async (id, body) => {
      refunds.push(body)
      return {
        id: 'rfnd_fairness',
        payment_id: id,
        amount: body.amount,
        currency: 'INR',
        receipt: body.receipt,
        status: 'processed',
      }
    }
    assert.equal(await service.processLateCaptureWatches(20), 0)
    assert.equal(await service.processLateCaptureWatches(20), 1)
    assert.equal(observed.length, 21)
    assert.equal(new Set(observed).size, 21)
    assert.equal(refunds.length, 1)
    assert.equal(
      (
        await client
          .from('payments')
          .select('refunded_amount_paisa')
          .eq('id', paid.payment.paymentId)
          .single()
      ).data.refunded_amount_paisa,
      10000
    )
    assert.equal(
      (
        await client
          .from('late_capture_watches')
          .select('status')
          .eq('order_id', paid.orderId)
          .single()
      ).data.status,
      'refunded'
    )
    const target = fixtures[0]
    razorpay.orders.fetch = async () => {
      throw new Error('Provider unavailable')
    }
    for (let attempt = 1; attempt <= 8; attempt++) {
      assert.ifError(
        (
          await client
            .from('late_capture_watches')
            .update({ next_check_at: new Date(Date.now() - 1000).toISOString() })
            .eq('order_id', target.orderId)
        ).error
      )
      await service.processLateCaptureWatches(20)
      const watch = (
        await client
          .from('late_capture_watches')
          .select('*')
          .eq('order_id', target.orderId)
          .single()
      ).data
      assert.equal(watch.failed_checks, attempt)
      const delay = new Date(watch.next_check_at).getTime() - Date.now()
      assert.ok(delay > Math.min(3600, 60 * 2 ** (attempt - 1)) * 1000 - 5000)
      assert.ok(delay <= 3600_000)
    }
  }
)

test(
  'watch checks advance due time and reject observations without the execution lease',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key)
    const fixture = await createOrderFixture(client, {
      status: 'cancelled',
      paymentStatus: 'failed',
    })
    const payment = await createPaymentFixture(client, fixture, {
      status: 'created',
      razorpayPaymentId: null,
    })
    t.after(() => cleanupOrderFixture(client, fixture))
    assert.ifError(
      (
        await client.from('late_capture_watches').insert({
          order_id: fixture.orderId,
          payment_id: payment.paymentId,
          razorpay_order_id: payment.razorpayOrderId,
          expected_amount_paisa: fixture.amountPaisa,
          currency: 'INR',
          reason: 'Scheduling fixture',
        })
      ).error
    )
    const lease = await claimLease(client, 'checkout_payment', fixture.orderId)
    const start = await client.rpc('begin_late_capture_check', {
      ...lease,
      p_order_id: fixture.orderId,
    })
    assert.ifError(start.error)
    assert.equal(start.data, true)
    assert.equal(
      (await client.rpc('begin_late_capture_check', { ...lease, p_order_id: fixture.orderId }))
        .data,
      false
    )
    const finish = await client.rpc('finish_late_capture_check', {
      ...lease,
      p_order_id: fixture.orderId,
      p_error: null,
    })
    assert.ifError(finish.error)
    const row = (
      await client.from('late_capture_watches').select('*').eq('order_id', fixture.orderId).single()
    ).data
    assert.equal(row.check_attempts, 1)
    assert.equal(row.failed_checks, 0)
    assert.ok(new Date(row.next_check_at).getTime() > Date.now() + 50_000)
    assert.ok(
      (
        await client.rpc('finish_late_capture_check', {
          ...lease,
          p_execution_owner_token: crypto.randomUUID(),
          p_order_id: fixture.orderId,
          p_error: 'stale response',
        })
      ).error
    )
  }
)

test(
  'confirmed cancellation durably queues refund and waiting does not exhaust retries',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key)
    const fixture = await createOrderFixture(client, {
      shiprocketOrderId: '9100051',
      shipmentId: '8100051',
    })
    const payment = await createPaymentFixture(client, fixture)
    t.after(() => cleanupOrderFixture(client, fixture))
    const partial = await client.rpc('prepare_provider_operation', {
      p_provider: 'razorpay',
      p_operation_type: 'partial_refund',
      p_business_key: crypto.randomUUID(),
      p_order_id: fixture.orderId,
      p_payment_id: payment.paymentId,
      p_provider_target_type: 'payment',
      p_provider_target_id: payment.razorpayPaymentId,
      p_amount_paisa: 2500,
      p_currency: 'INR',
      p_request_hash: 'b'.repeat(64),
      p_cause: 'Earlier partial refund',
    })
    assert.ifError(partial.error)
    const fulfillment = await claimLease(client, 'fulfillment_order', fixture.orderId)
    const cancellation = await client.rpc('prepare_shiprocket_cancellation', {
      ...fulfillment,
      p_order_id: fixture.orderId,
      p_cause: 'Cancellation integration',
    })
    assert.ifError(cancellation.error)
    const op = cancellation.data
    const lease = await claimLease(client, 'provider_operation', op.id)
    assert.ifError(
      (await client.rpc('claim_provider_operation_dispatch', { ...lease, p_operation_id: op.id }))
        .error
    )
    assert.ifError(
      (
        await client.rpc('record_provider_operation_result', {
          ...lease,
          p_operation_id: op.id,
          p_state: 'provider_succeeded',
          p_provider_operation_id: null,
          p_provider_status: 'cancelled',
          p_response_metadata: {},
          p_error_classification: null,
          p_manual_review_reason: null,
        })
      ).error
    )
    const finalArgs = {
      ...lease,
      p_operation_id: op.id,
      p_provider_target_type: op.provider_target_type,
      p_provider_target_id: op.provider_target_id,
      p_payment_id: null,
      p_amount_paisa: null,
      p_currency: null,
      p_request_hash: op.request_hash,
    }
    assert.ifError((await client.rpc('finalize_provider_operation', finalArgs)).error)
    assert.ifError((await client.rpc('finalize_provider_operation', finalArgs)).error)
    const jobs = await client
      .from('retry_jobs')
      .select('*')
      .eq('job_type', 'cancellation_refund')
      .eq('reference_id', op.id)
    assert.ifError(jobs.error)
    assert.equal(jobs.data.length, 1)
    const job = jobs.data[0]
    const jobToken = crypto.randomUUID()
    assert.ifError(
      (
        await client
          .from('retry_jobs')
          .update({
            status: 'processing',
            lease_token: jobToken,
            claimed_at: new Date().toISOString(),
            lease_expires_at: new Date(Date.now() + 60000).toISOString(),
          })
          .eq('id', job.id)
      ).error
    )
    const guardedLease = await client.rpc('claim_operation_lease', {
      p_scope: 'retry_job_effect',
      p_resource_id: job.id,
      p_lease_seconds: 120,
      p_guard_type: 'retry_job',
      p_guard_id: job.id,
      p_guard_token: jobToken,
    })
    assert.ifError(guardedLease.error)
    assert.ifError(
      (
        await client
          .from('retry_jobs')
          .update({ lease_token: crypto.randomUUID() })
          .eq('id', job.id)
      ).error
    )
    const stale = guardedLease.data[0]
    const service = require('../server/dist/services/providerOperations.js')
    await assert.rejects(
      service.processCancellationRefund(op.id, {
        executionLease: {
          scope: stale.scope,
          resourceId: stale.resource_id,
          ownerToken: stale.owner_token,
          fencingToken: stale.fencing_token,
        },
        guard: { type: 'retry_job', id: job.id, token: jobToken },
      })
    )
    for (let i = 0; i < 7; i++) {
      const token = crypto.randomUUID()
      assert.ifError(
        (
          await client
            .from('retry_jobs')
            .update({
              status: 'processing',
              lease_token: token,
              claimed_at: new Date().toISOString(),
              lease_expires_at: new Date(Date.now() + 60000).toISOString(),
            })
            .eq('id', job.id)
        ).error
      )
      assert.equal(
        (
          await client.rpc('defer_retry_job', {
            p_job_id: job.id,
            p_lease_token: token,
            p_reason: 'Waiting for prior refund',
          })
        ).data,
        true
      )
    }
    const deferred = (await client.from('retry_jobs').select('*').eq('id', job.id).single()).data
    assert.equal(deferred.retry_count, 0)
    assert.equal(deferred.status, 'pending')
    assert.equal(
      (
        await client.rpc('prepare_remaining_refund', {
          p_order_id: fixture.orderId,
          p_cause: `Refund after cancellation ${op.id}`,
          p_cancellation_operation_id: op.id,
        })
      ).data.status,
      'waiting'
    )
    const partialLease = await claimLease(client, 'provider_operation', partial.data.id)
    assert.ifError(
      (
        await client.rpc('claim_razorpay_refund_dispatch', {
          ...paymentEnvironment(),
          ...partialLease,
          p_operation_id: partial.data.id,
        })
      ).error
    )
    assert.ifError(
      (
        await client.rpc('record_provider_operation_result', {
          ...partialLease,
          p_operation_id: partial.data.id,
          p_state: 'provider_succeeded',
          p_provider_operation_id: 'rfnd_before_cancel',
          p_provider_status: 'processed',
          p_response_metadata: {},
          p_error_classification: null,
          p_manual_review_reason: null,
        })
      ).error
    )
    assert.ifError(
      (
        await client.rpc('finalize_razorpay_refund', {
          ...paymentEnvironment(),
          ...partialLease,
          p_operation_id: partial.data.id,
          p_provider_target_type: 'payment',
          p_provider_target_id: payment.razorpayPaymentId,
          p_payment_id: payment.paymentId,
          p_amount_paisa: 2500,
          p_currency: 'INR',
          p_request_hash: 'b'.repeat(64),
        })
      ).error
    )
    const refund = await client.rpc('prepare_remaining_refund', {
      p_order_id: fixture.orderId,
      p_cause: `Refund after cancellation ${op.id}`,
      p_cancellation_operation_id: op.id,
    })
    assert.ifError(refund.error)
    assert.equal(refund.data.operation.amount_paisa, fixture.amountPaisa - 2500)
  }
)

test(
  'refund prepared immediately before a crash is dispatched by reconciliation',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key),
      fixture = await createOrderFixture(client, { status: 'cancelled', paymentStatus: 'failed' })
    const payment = await createPaymentFixture(client, fixture, {
      status: 'created',
      razorpayPaymentId: null,
    })
    t.after(() => cleanupOrderFixture(client, fixture))
    assert.ifError(
      (
        await client.from('late_capture_watches').insert({
          order_id: fixture.orderId,
          payment_id: payment.paymentId,
          razorpay_order_id: payment.razorpayOrderId,
          expected_amount_paisa: fixture.amountPaisa,
          currency: 'INR',
          reason: 'Crash recovery',
        })
      ).error
    )
    const lease = await claimLease(client, 'checkout_payment', fixture.orderId)
    const prepared = await client.rpc('prepare_late_capture_refund_fenced', {
      ...lease,
      p_order_id: fixture.orderId,
      p_razorpay_order_id: payment.razorpayOrderId,
      p_razorpay_payment_id: 'pay_crash_fixture',
      p_amount_paisa: fixture.amountPaisa,
      p_currency: 'INR',
      p_request_hash: 'c'.repeat(64),
      p_reason: 'Crash fixture',
    })
    assert.ifError(prepared.error)
    assert.equal(prepared.data.state, 'prepared')
    const { razorpay } = require('../server/dist/lib/razorpay/client.js'),
      original = razorpay.payments.refund
    let mutations = 0
    t.after(() => {
      razorpay.payments.refund = original
    })
    razorpay.payments.refund = async (id, body) => {
      mutations++
      return {
        id: 'rfnd_crash',
        payment_id: id,
        amount: body.amount,
        currency: 'INR',
        receipt: body.receipt,
        status: 'processed',
      }
    }
    const service = require('../server/dist/services/providerOperations.js')
    await service.reconcileActionableProviderOperations(100)
    await service.reconcileActionableProviderOperations(100)
    assert.equal(mutations, 1)
    assert.equal(
      (
        await client
          .from('late_capture_watches')
          .select('status')
          .eq('order_id', fixture.orderId)
          .single()
      ).data.status,
      'refunded'
    )
  }
)

test(
  'cancellation preserves a pending automatic refund without an immediate second lookup',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key),
      fixture = await createOrderFixture(client, {
        shiprocketOrderId: '9001052',
        shipmentId: '8001052',
      })
    await createPaymentFixture(client, fixture)
    t.after(() => cleanupOrderFixture(client, fixture))
    const { razorpay } = require('../server/dist/lib/razorpay/client.js')
    const originals = {
      refund: razorpay.payments.refund,
      lookup: razorpay.payments.fetchMultipleRefund,
    }
    t.after(() => {
      razorpay.payments.refund = originals.refund
      razorpay.payments.fetchMultipleRefund = originals.lookup
    })
    let mutations = 0,
      lookups = 0
    razorpay.payments.refund = async (id, body) => {
      mutations++
      return {
        id: 'rfnd_cancel_pending',
        payment_id: id,
        amount: body.amount,
        currency: 'INR',
        receipt: body.receipt,
        status: 'pending',
      }
    }
    razorpay.payments.fetchMultipleRefund = async () => {
      lookups++
      return { items: [] }
    }
    const service = require('../server/dist/services/providerOperations.js')
    const result = await service.cancelOrderWithProviderSafety(
      fixture.orderId,
      'Requested cancellation',
      {
        mutate: async () => ({ status: 'cancelled', definitive: true, metadata: {} }),
        reconcile: async () => null,
      }
    )
    assert.equal(result.cancellation.state, 'provider_succeeded')
    assert.equal(result.refund.state, 'provider_pending')
    assert.equal(result.refund.local_applied_at, null)
    assert.equal(mutations, 1)
    assert.equal(lookups, 0)
    assert.equal(
      (
        await client
          .from('orders')
          .select('status,payment_status')
          .eq('id', fixture.orderId)
          .single()
      ).data.payment_status,
      'paid'
    )
  }
)

test(
  'a confirmed cancellation intent survives a crash before provider dispatch',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key),
      fixture = await createOrderFixture(client, {
        shiprocketOrderId: '9001053',
        shipmentId: '8001053',
      })
    await createPaymentFixture(client, fixture)
    t.after(() => cleanupOrderFixture(client, fixture))
    const preparation = await claimLease(client, 'fulfillment_order', fixture.orderId)
    const prepared = await client.rpc('prepare_shiprocket_cancellation', {
      ...preparation,
      p_order_id: fixture.orderId,
      p_cause: 'Confirmed before process crash',
    })
    assert.ifError(prepared.error)
    assert.equal(prepared.data.state, 'prepared')
    // A crashed process must lose its order lease before another worker dispatches.
    await client.rpc('release_operation_lease', {
      p_scope: 'fulfillment_order',
      p_resource_id: fixture.orderId,
      p_owner_token: preparation.p_execution_owner_token,
      p_fencing_token: preparation.p_execution_fencing_token,
    })
    const service = require('../server/dist/services/providerOperations.js'),
      adapter = service.shiprocketCancellationAdapter
    const original = adapter.mutate
    let calls = 0
    adapter.mutate = async (operation) => {
      calls++
      assert.equal(operation.id, prepared.data.id)
      assert.equal(operation.cause, 'Confirmed before process crash')
      return { status: 'cancelled', definitive: true, metadata: {} }
    }
    t.after(() => {
      adapter.mutate = original
    })
    await service.reconcileActionableProviderOperations(100)
    await service.reconcileActionableProviderOperations(100)
    assert.equal(calls, 1)
    assert.equal(
      (await client.from('orders').select('status').eq('id', fixture.orderId).single()).data.status,
      'cancelled'
    )
    assert.equal(
      (
        await client
          .from('retry_jobs')
          .select('id', { count: 'exact' })
          .eq('job_type', 'cancellation_refund')
          .eq('reference_id', prepared.data.id)
      ).count,
      1
    )
  }
)
