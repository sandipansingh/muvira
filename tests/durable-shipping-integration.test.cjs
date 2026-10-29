require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
require('./helpers/test-env.cjs').configureTestEnvironment()
const { env: simulatedConfiguration } = require('../server/dist/config/env.js')
Object.assign(process.env, { RAZORPAY_MODE: 'live', RAZORPAY_KEY_ID: 'rzp_live_fixture' })
Object.assign(simulatedConfiguration, {
  RAZORPAY_MODE: 'live',
  RAZORPAY_KEY_ID: 'rzp_live_fixture',
})
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
  claimLease,
} = require('./helpers/provider-db-fixture.cjs')
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const {
  runShippingOperation,
  dispatchShippingOperation,
} = require('../server/dist/services/shippingOperations.js')
const { withExecutionLease } = require('../server/dist/services/executionLease.js')
const {
  processShiprocketWebhook,
  processStoredShiprocketWebhook,
} = require('../server/dist/modules/shiprocket/service.js')
const url = process.env.SUPABASE_TEST_URL,
  key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const enabled = !!url && !!key

test(
  'durable creation survives provider success and a lost result write without a second mutation',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db)
    await createPaymentFixture(db, order)
    const originalFetch = global.fetch,
      originalRpc = adminSupabase.rpc
    const wire = {
      order_id: `SYNTHETIC-${crypto.randomUUID()}`,
      sub_total: 100,
      payment_method: 'Prepaid',
      shipping_pincode: '400001',
      pickup_location: 'Fixture',
      weight: 0.5,
      length: 10,
      breadth: 8,
      height: 5,
      order_items: [{ name: 'Synthetic', sku: 'SYNTHETIC', units: 1, selling_price: 100 }],
    }
    let creates = 0,
      failResult = true
    global.fetch = async (input, options) => {
      const target = String(input)
      if (!target.startsWith('https://apiv2.shiprocket.in/')) return originalFetch(input, options)
      if (target.endsWith('/auth/login')) return Response.json({ token: 'synthetic' })
      if (target.endsWith('/orders/create/adhoc')) {
        creates++
        return Response.json({
          order_id: 919001,
          shipment_id: 818001,
          status: 'NEW',
          status_code: 1,
        })
      }
      const result = {
        id: 919001,
        channel_order_id: wire.order_id,
        total: '100.00',
        currency: 'INR',
        customer_pincode: '400001',
        payment_method: 'Prepaid',
        products: [{ sku: 'SYNTHETIC', quantity: 1, selling_price: 100 }],
        shipments: { id: 818001 },
      }
      if (target.includes('/orders?')) return Response.json({ data: [result] })
      if (target.endsWith('/orders/show/919001')) return Response.json({ data: result })
      throw new Error('Unexpected synthetic endpoint')
    }
    adminSupabase.rpc = function (name, args) {
      if (name === 'record_provider_operation_result' && failResult) {
        failResult = false
        return Promise.resolve({
          data: null,
          error: { code: '08006', message: 'Synthetic lost DB connection' },
        })
      }
      return originalRpc.call(this, name, args)
    }
    t.after(async () => {
      global.fetch = originalFetch
      adminSupabase.rpc = originalRpc
      await cleanupOrderFixture(db, order)
    })
    await assert.rejects(
      withExecutionLease('fulfillment_order', order.orderId, ({ lease }) =>
        runShippingOperation(
          order.orderId,
          'create_order',
          { wire },
          lease,
          'Synthetic fulfillment'
        )
      )
    )
    const operations = await db
      .from('provider_operations')
      .select('*')
      .eq('order_id', order.orderId)
    assert.equal(operations.data.length, 1)
    assert.equal(operations.data[0].state, 'dispatching')
    assert.ok(
      (
        await db
          .from('shipping_operation_requests')
          .update({ request: {} })
          .eq('operation_id', operations.data[0].id)
      ).error
    )
    const recovered = await dispatchShippingOperation(operations.data[0].id)
    assert.ok(recovered.local_applied_at)
    assert.equal(creates, 1)
    assert.equal(
      (
        await db
          .from('orders')
          .select('shiprocket_order_id,shipment_id,status')
          .eq('id', order.orderId)
          .single()
      ).data.shipment_id,
      '818001'
    )
    assert.ok(
      (
        await db.rpc('claim_provider_operation_dispatch', {
          ...(await claimLease(db, 'provider_operation', operations.data[0].id)),
          p_operation_id: operations.data[0].id,
        })
      ).error
    )
  }
)

test(
  'unpaid and terminal fulfillment, unresolved cancellation, stale repairs and lease loss are rejected',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db, {
        shipmentId: '771',
        shiprocketOrderId: '881',
        awbCode: 'SYNTHETIC-771',
      })
    await createPaymentFixture(db, order)
    t.after(() => cleanupOrderFixture(db, order))
    const lease = await claimLease(db, 'fulfillment_order', order.orderId)
    assert.ifError(
      (await db.rpc('assert_fulfillment_mutation_allowed', { ...lease, p_order_id: order.orderId }))
        .error
    )
    for (const status of ['cancelled', 'delivered', 'refunded', 'returned', 'lost', 'damaged']) {
      assert.ifError((await db.from('orders').update({ status }).eq('id', order.orderId)).error)
      assert.ok(
        (
          await db.rpc('assert_fulfillment_mutation_allowed', {
            ...lease,
            p_order_id: order.orderId,
          })
        ).error
      )
    }
    await db.from('orders').update({ status: 'processing' }).eq('id', order.orderId)
    const stale = await db.rpc('apply_shiprocket_persistence_fenced', {
      ...lease,
      p_order_id: order.orderId,
      p_persistence: { shipment_id: 'OLD', shiprocket_order_id: '881' },
    })
    assert.ok(stale.error)
    const invalid = { ...lease, p_execution_fencing_token: 0, p_order_id: order.orderId }
    assert.ok((await db.rpc('assert_fulfillment_mutation_allowed', invalid)).error)
    await db
      .from('payments')
      .update({ status: 'created', razorpay_payment_id: null })
      .eq('order_id', order.orderId)
    assert.ok(
      (await db.rpc('assert_fulfillment_mutation_allowed', { ...lease, p_order_id: order.orderId }))
        .error
    )
  }
)

test(
  'observations apply atomically, deduplicate scans, protect identities and converge across missed milestones',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db, {
        shipmentId: '772',
        shiprocketOrderId: '882',
        awbCode: 'SYNTHETIC-772',
        status: 'processing',
      })
    t.after(() => cleanupOrderFixture(db, order))
    const observation = {
      awb: 'SYNTHETIC-772',
      shipment_id: 772,
      sr_order_id: 882,
      current_status: 'OUT FOR DELIVERY',
      current_timestamp: '2026-10-20T00:00:00Z',
      scans: [{ date: '2026-10-19T00:00:00Z', activity: 'Picked up', location: 'Fixture' }],
    }
    assert.equal((await processShiprocketWebhook(observation)).applied, true)
    assert.equal((await processShiprocketWebhook(observation)).applied, false)
    assert.equal(
      (
        await db
          .from('shipment_events')
          .select('id', { count: 'exact' })
          .eq('order_id', order.orderId)
      ).count,
      2
    )
    await assert.rejects(
      processShiprocketWebhook({
        ...observation,
        shipment_id: 999,
        current_timestamp: '2026-10-22T00:00:00Z',
      })
    )
    await processShiprocketWebhook({
      ...observation,
      current_status: 'IN TRANSIT',
      current_timestamp: '2026-10-18T00:00:00Z',
    })
    assert.equal(
      (await db.from('orders').select('shiprocket_status').eq('id', order.orderId).single()).data
        .shiprocket_status,
      'OUT FOR DELIVERY'
    )
    await processShiprocketWebhook({
      ...observation,
      current_status: 'DELIVERED',
      current_timestamp: '2026-10-22T00:00:00Z',
    })
    assert.equal(
      (await db.from('orders').select('status').eq('id', order.orderId).single()).data.status,
      'delivered'
    )
    await processShiprocketWebhook({
      ...observation,
      current_status: 'IN TRANSIT',
      current_timestamp: '2026-10-23T00:00:00Z',
    })
    assert.equal(
      (await db.from('orders').select('shiprocket_status').eq('id', order.orderId).single()).data
        .shiprocket_status,
      'DELIVERED'
    )
  }
)

test(
  'webhook receipt and job are atomic, concurrent deliveries converge and unknown shipments remain unfinished',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      payload = {
        awb: `SYNTHETIC-${crypto.randomUUID()}`,
        current_status: 'IN TRANSIT',
        current_timestamp: '2026-10-20T00:00:00Z',
      }
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        db.rpc('accept_shipping_webhook', { p_payload_hash: hash, p_payload: payload })
      )
    )
    attempts.forEach((result) => assert.ifError(result.error))
    const id = attempts[0].data.id
    t.after(async () => {
      await db.from('retry_jobs').delete().eq('reference_id', id)
      await db.from('webhook_events').delete().eq('id', id)
    })
    assert.ok(attempts.every((result) => result.data.id === id))
    assert.equal(
      (await db.from('retry_jobs').select('id', { count: 'exact' }).eq('reference_id', id)).count,
      1
    )
    const job = (await db.from('retry_jobs').select('id').eq('reference_id', id).single()).data
    const lease = await claimLease(db, 'retry_job_effect', job.id)
    await assert.rejects(
      processStoredShiprocketWebhook(id, {
        scope: lease.p_execution_scope,
        resourceId: lease.p_execution_resource_id,
        ownerToken: lease.p_execution_owner_token,
        fencingToken: lease.p_execution_fencing_token,
      })
    )
    const receipt = (
      await db
        .from('webhook_events')
        .select('processing_status,shipping_match_attempts')
        .eq('id', id)
        .single()
    ).data
    assert.equal(receipt.processing_status, 'verified')
    assert.equal(receipt.shipping_match_attempts, 1)
  }
)

test(
  'NDR202 is accepted once per episode, private comments stay private, and terminal tracking releases refunds',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db, {
        shipmentId: '773',
        shiprocketOrderId: '883',
        awbCode: 'SYNTHETIC-773',
        status: 'delivery_failed',
      })
    await createPaymentFixture(db, order)
    const originalFetch = global.fetch
    let submissions = 0,
      throwSubmission = false,
      attempt = 1
    const episode = () => `991:${attempt}:2026-10-19 12:00:00`
    global.fetch = async (input, options) => {
      const target = String(input)
      if (!target.startsWith('https://apiv2.shiprocket.in/')) return originalFetch(input, options)
      if (target.endsWith('/auth/login')) return Response.json({ token: 'synthetic' })
      if (target.endsWith('/ndr/SYNTHETIC-773'))
        return Response.json({
          data: [
            {
              id: 991,
              shipment_id: 773,
              awb_code: 'SYNTHETIC-773',
              ndr_raised_at: '2026-10-19 12:00:00',
              attempts: attempt,
              reason: 'Synthetic reason',
            },
          ],
        })
      if (target.endsWith('/ndr/SYNTHETIC-773/action')) {
        submissions++
        if (throwSubmission) throw new TypeError('fetch failed')
        return Response.json({ status: 'Data Updated Sucessfully' }, { status: 202 })
      }
      throw new Error('Unexpected synthetic endpoint')
    }
    t.after(async () => {
      global.fetch = originalFetch
      await cleanupOrderFixture(db, order)
    })
    const service = require('../server/dist/modules/orders/service.js')
    const input = {
      action: 're-attempt',
      comments: 'PRIVATE-SYNTHETIC-NDR-COMMENT',
      request_id: crypto.randomUUID(),
      episode_id: episode(),
    }
    const accepted = await service.adminNdrAction(order.orderId, input, order.userId)
    assert.equal(accepted.outcome, 'request accepted')
    assert.equal(accepted.state, 'provider_pending')
    assert.equal((await service.adminNdrAction(order.orderId, input, order.userId)).id, accepted.id)
    await assert.rejects(
      service.adminNdrAction(
        order.orderId,
        { ...input, request_id: crypto.randomUUID() },
        order.userId
      )
    )
    assert.equal(submissions, 1)
    assert.equal(
      (await db.from('provider_operations').select('cause').eq('id', accepted.id).single()).data
        .cause,
      'Admin NDR action'
    )
    assert.equal(
      (await db.from('orders').select('status').eq('id', order.orderId).single()).data.status,
      'delivery_failed'
    )
    await processShiprocketWebhook({
      awb: 'SYNTHETIC-773',
      shipment_id: 773,
      sr_order_id: 883,
      current_status: 'LOST',
      current_timestamp: '2026-10-20T00:00:00Z',
    })
    assert.ok(
      (
        await db
          .from('provider_operations')
          .select('local_applied_at')
          .eq('id', accepted.id)
          .single()
      ).data.local_applied_at
    )
    const refund = await require('../server/dist/services/providerOperations.js').prepareRefund(
      order.orderId,
      { cause: 'Synthetic lost parcel refund' }
    )
    assert.equal(refund.state, 'prepared')
    // A separate episode with an ambiguous action stays in review and cannot be replayed.
    await db.from('provider_operations').delete().eq('id', refund.id)
    await db.from('orders').update({ status: 'delivery_failed' }).eq('id', order.orderId)
    attempt = 2
    throwSubmission = true
    const ambiguous = await service.adminNdrAction(
      order.orderId,
      { ...input, request_id: crypto.randomUUID(), episode_id: episode() },
      order.userId
    )
    assert.equal(ambiguous.state, 'manual_review')
    assert.equal(submissions, 2)
    await assert.rejects(
      service.adminNdrAction(
        order.orderId,
        { ...input, request_id: crypto.randomUUID(), episode_id: episode() },
        order.userId
      )
    )
    assert.equal(submissions, 2)
  }
)

test(
  'more than20 tracking-only accepted NDR records cannot starve a newer cancellation',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      pending = await createOrderFixture(db, {
        shipmentId: '774',
        shiprocketOrderId: '884',
        awbCode: 'SYNTHETIC-774',
        status: 'delivery_failed',
      }),
      cancelled = await createOrderFixture(db, { shipmentId: '775', shiprocketOrderId: '885' })
    await createPaymentFixture(db, cancelled)
    t.after(async () => {
      await cleanupOrderFixture(db, pending)
      await cleanupOrderFixture(db, cancelled)
    })
    assert.ifError(
      (
        await db.from('provider_operations').insert(
          Array.from({ length: 21 }, (_, i) => ({
            provider: 'shiprocket',
            operation_type: 'ndr_action',
            business_key: `synthetic-${pending.orderId}-${i}`,
            order_id: pending.orderId,
            provider_target_type: 'awb',
            provider_target_id: 'SYNTHETIC-774',
            provider_generation: '884:774',
            request_hash: 'f'.repeat(64),
            idempotency_key: crypto.randomUUID(),
            cause: 'Synthetic accepted episode',
            state: 'provider_pending',
            updated_at: '2026-01-01T00:00:00Z',
          }))
        )
      ).error
    )
    const preparation = await claimLease(db, 'fulfillment_order', cancelled.orderId)
    const prepared = await db.rpc('prepare_shiprocket_cancellation', {
      ...preparation,
      p_order_id: cancelled.orderId,
      p_cause: 'Synthetic cancellation',
    })
    assert.ifError(prepared.error)
    await db.rpc('release_operation_lease', {
      p_scope: 'fulfillment_order',
      p_resource_id: cancelled.orderId,
      p_owner_token: preparation.p_execution_owner_token,
      p_fencing_token: preparation.p_execution_fencing_token,
    })
    const service = require('../server/dist/services/providerOperations.js'),
      adapter = service.shiprocketCancellationAdapter,
      original = adapter.mutate
    let calls = 0
    adapter.mutate = async (operation) => {
      calls++
      assert.equal(operation.id, prepared.data.id)
      return { status: 'cancelled', definitive: true, metadata: {} }
    }
    t.after(() => {
      adapter.mutate = original
    })
    await service.reconcileActionableProviderOperations(20)
    assert.equal(calls, 1)
  }
)

for (const terminal of ['DELIVERED', 'LOST'])
  test(
    `durable pickup finalization survives ${terminal} tracking without regressing progress`,
    { skip: !enabled },
    async (t) => {
      const db = serviceClient(url, key),
        order = await createOrderFixture(db, {
          shipmentId: '776',
          shiprocketOrderId: '886',
          awbCode: 'SYNTHETIC-776',
          status: 'processing',
        })
      await createPaymentFixture(db, order)
      const originalFetch = global.fetch,
        originalRpc = adminSupabase.rpc
      let failApplication = true,
        pickups = 0
      global.fetch = async (input, options) => {
        const target = String(input)
        if (!target.startsWith('https://apiv2.shiprocket.in/')) return originalFetch(input, options)
        if (target.endsWith('/auth/login')) return Response.json({ token: 'synthetic' })
        if (target.endsWith('/courier/generate/pickup')) {
          pickups++
          return Response.json({
            pickup_status: 1,
            response: {
              status: 3,
              pickup_scheduled_date: '2026-10-19T06:00:00Z',
              pickup_token_number: 'SYNTHETIC',
            },
          })
        }
        throw new Error('Unexpected synthetic provider endpoint')
      }
      adminSupabase.rpc = function (name, args) {
        if (name === 'finalize_shipping_operation' && failApplication) {
          failApplication = false
          return Promise.resolve({
            error: { code: '08006', message: 'Synthetic local application failure' },
            data: null,
          })
        }
        return originalRpc.call(this, name, args)
      }
      t.after(async () => {
        global.fetch = originalFetch
        adminSupabase.rpc = originalRpc
        await cleanupOrderFixture(db, order)
      })
      await assert.rejects(
        withExecutionLease('fulfillment_order', order.orderId, ({ lease }) =>
          runShippingOperation(
            order.orderId,
            'schedule_pickup',
            { wire: { shipment_id: [776] } },
            lease,
            'Synthetic pickup'
          )
        )
      )
      const operation = (
        await db
          .from('provider_operations')
          .select('id,state')
          .eq('order_id', order.orderId)
          .single()
      ).data
      assert.equal(operation.state, 'provider_succeeded')
      await db
        .from('orders')
        .update({ fulfillment_step: 'ready_for_pickup', fulfillment_status: 'partial' })
        .eq('id', order.orderId)
      await processShiprocketWebhook({
        awb: 'SYNTHETIC-776',
        shipment_id: 776,
        sr_order_id: 886,
        current_status: terminal,
        current_timestamp: '2026-10-22T00:00:00Z',
      })
      assert.ok((await dispatchShippingOperation(operation.id)).local_applied_at)
      const saved = (
        await db
          .from('orders')
          .select('status,fulfillment_step,fulfillment_status,pickup_token_number')
          .eq('id', order.orderId)
          .single()
      ).data
      assert.equal(saved.status, terminal === 'DELIVERED' ? 'delivered' : 'lost')
      assert.equal(saved.fulfillment_step, 'ready_for_pickup')
      assert.equal(saved.fulfillment_status, terminal === 'DELIVERED' ? 'fulfilled' : 'exception')
      assert.equal(saved.pickup_token_number, 'SYNTHETIC')
      assert.equal(pickups, 1)
      if (terminal === 'LOST')
        assert.equal(
          (
            await require('../server/dist/services/providerOperations.js').prepareRefund(
              order.orderId,
              { cause: 'Synthetic loss after pickup' }
            )
          ).state,
          'prepared'
        )
    }
  )

test(
  'canonical observations preserve analytics and emit one status event without unsupported processing notifications',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db, {
        shipmentId: '777',
        shiprocketOrderId: '887',
        awbCode: 'SYNTHETIC-777',
        status: 'processing',
      })
    const processing = await createOrderFixture(db, {
      shipmentId: '778',
      shiprocketOrderId: '888',
      awbCode: 'SYNTHETIC-778',
      status: 'confirmed',
    })
    const { orderEvents } = require('../server/dist/services/eventBus.js')
    let events = 0
    const listener = (payload) => {
      if (payload.orderId === order.orderId) events++
    }
    orderEvents.on('order:status:changed', listener)
    t.after(async () => {
      orderEvents.off('order:status:changed', listener)
      await cleanupOrderFixture(db, order)
      await cleanupOrderFixture(db, processing)
    })
    const observation = {
      awb: 'SYNTHETIC-777',
      shipment_id: 777,
      sr_order_id: 887,
      current_status: 'DELIVERED',
      current_timestamp: '2026-10-22T00:00:00Z',
      origin: 'Mumbai',
      destination: 'Kolkata',
      etd: '2026-10-22',
      pickup_date: '2026-10-19T06:00:00Z',
      delivered_date: '2026-10-22T00:00:00Z',
    }
    await processShiprocketWebhook(observation)
    await processShiprocketWebhook(observation)
    await new Promise((resolve) => setImmediate(resolve))
    const snapshot = (
      await db
        .from('tracking_snapshots')
        .select('origin,destination,estimated_delivery_date,pickup_date,delivered_date')
        .eq('order_id', order.orderId)
        .single()
    ).data
    assert.equal(snapshot.origin, 'Mumbai')
    assert.equal(snapshot.destination, 'Kolkata')
    assert.equal(snapshot.estimated_delivery_date, '2026-10-22')
    assert.ok(snapshot.pickup_date)
    assert.ok(snapshot.delivered_date)
    assert.equal(events, 1)
    await processShiprocketWebhook({
      awb: 'SYNTHETIC-778',
      shipment_id: 778,
      sr_order_id: 888,
      current_status: 'NEW',
      current_timestamp: '2026-10-19T00:00:00Z',
    })
    assert.equal(
      (
        await db
          .from('outbox_events')
          .select('id', { count: 'exact' })
          .eq('aggregate_id', processing.orderId)
      ).count,
      0
    )
  }
)

test(
  'NDR reattempt and RTO observations retain established fulfillment classifications',
  { skip: !enabled },
  async (t) => {
    const db = serviceClient(url, key),
      order = await createOrderFixture(db, {
        shipmentId: '779',
        shiprocketOrderId: '889',
        awbCode: 'SYNTHETIC-779',
        status: 'processing',
      })
    t.after(() => cleanupOrderFixture(db, order))
    for (const [status, day, expected, fulfillment] of [
      ['UNDELIVERED', 19, 'delivery_failed', 'exception'],
      ['IN TRANSIT', 20, 'shipped', 'fulfilled'],
      ['RTO INITIATED', 21, 'rto', 'fulfilled'],
      ['RTO DELIVERED', 22, 'returned', 'fulfilled'],
    ]) {
      await processShiprocketWebhook({
        awb: 'SYNTHETIC-779',
        shipment_id: 779,
        sr_order_id: 889,
        current_status: status,
        current_timestamp: `2026-10-${day}T00:00:00Z`,
      })
      const row = (
        await db.from('orders').select('status,fulfillment_status').eq('id', order.orderId).single()
      ).data
      assert.equal(row.status, expected)
      assert.equal(row.fulfillment_status, fulfillment)
    }
  }
)
