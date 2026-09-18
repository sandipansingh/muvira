const assert = require('node:assert/strict')
const test = require('node:test')
const {
  claimLease,
  cleanupOrderFixture,
  createOrderFixture,
  serviceClient,
} = require('./helpers/provider-db-fixture.cjs')

const apiUrl = process.env.SUPABASE_TEST_URL
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'Shiprocket cancellation freezes one target and blocks later fulfillment',
  { skip: !apiUrl || !serviceRoleKey },
  async (context) => {
    const first = serviceClient(apiUrl, serviceRoleKey)
    const second = serviceClient(apiUrl, serviceRoleKey)
    const order = await createOrderFixture(first, {
      shiprocketOrderId: '9001001',
      shipmentId: '8001001',
      awbCode: 'AWB9001001',
    })
    context.after(() => cleanupOrderFixture(first, order))

    const preparationLease = await claimLease(first, 'fulfillment_order', order.orderId)
    const prepared = await first.rpc('prepare_shiprocket_cancellation', {
      ...preparationLease,
      p_order_id: order.orderId,
      p_cause: 'Cancellation target freeze test',
    })
    assert.ifError(prepared.error)
    assert.equal(prepared.data.operation_type, 'cancel_shipment')
    assert.equal(prepared.data.provider_target_type, 'awb')
    assert.equal(prepared.data.provider_target_id, 'AWB9001001')
    assert.equal(prepared.data.provider_generation, '9001001:8001001')

    const released = await first.rpc('release_operation_lease', {
      p_scope: 'fulfillment_order',
      p_resource_id: order.orderId,
      p_owner_token: preparationLease.p_execution_owner_token,
      p_fencing_token: preparationLease.p_execution_fencing_token,
    })
    assert.ifError(released.error)
    assert.equal(released.data, true)

    const fulfillmentLease = await claimLease(second, 'fulfillment_order', order.orderId)
    const guarded = await second.rpc('assert_fulfillment_mutation_allowed', {
      ...fulfillmentLease,
      p_order_id: order.orderId,
    })
    assert.equal(guarded.error?.code, '55P03')

    const replay = await second.rpc('prepare_shiprocket_cancellation', {
      ...fulfillmentLease,
      p_order_id: order.orderId,
      p_cause: 'Cancellation target freeze test',
    })
    assert.ifError(replay.error)
    assert.equal(replay.data.id, prepared.data.id)
    assert.equal(replay.data.idempotency_key, prepared.data.idempotency_key)
  }
)
