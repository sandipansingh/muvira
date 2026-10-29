const assert = require('node:assert/strict')
const { claimLease } = require('./provider-db-fixture.cjs')
const paymentEnvironment = () => ({
  p_provider_mode: process.env.RAZORPAY_MODE || 'test',
  p_provider_key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_example',
})
async function bindOrderFixture(client, orderId) {
  const existing = await client
    .from('razorpay_order_bindings')
    .select('order_id')
    .eq('order_id', orderId)
    .maybeSingle()
  assert.ifError(existing.error)
  if (!existing.data)
    assert.ifError(
      (
        await client.from('razorpay_order_bindings').insert({
          order_id: orderId,
          mode: paymentEnvironment().p_provider_mode,
          key_id: paymentEnvironment().p_provider_key_id,
        })
      ).error
    )
}
async function seedCheckoutPayment(client, args) {
  await bindOrderFixture(client, args.p_order_id)
  const order = await client
    .from('orders')
    .select('total_amount_paisa')
    .eq('id', args.p_order_id)
    .single()
  assert.ifError(order.error)
  return client.from('payments').insert({
    order_id: args.p_order_id,
    razorpay_order_id: args.p_razorpay_order_id,
    amount_paisa: order.data.total_amount_paisa,
    currency: 'INR',
    status: 'created',
  })
}
async function finalizeCheckoutFixture(client, args) {
  const payment = await client
    .from('payments')
    .select('order_id')
    .eq('razorpay_order_id', args.p_razorpay_order_id)
    .single()
  assert.ifError(payment.error)
  await bindOrderFixture(client, payment.data.order_id)
  const lease = await claimLease(client, 'checkout_payment', payment.data.order_id)
  try {
    return await client.rpc('finalize_checkout_payment', {
      ...args,
      ...lease,
      ...paymentEnvironment(),
    })
  } finally {
    assert.ifError(
      (
        await client.rpc('release_operation_lease', {
          p_scope: lease.p_execution_scope,
          p_resource_id: lease.p_execution_resource_id,
          p_owner_token: lease.p_execution_owner_token,
          p_fencing_token: lease.p_execution_fencing_token,
        })
      ).error
    )
  }
}
module.exports = {
  paymentEnvironment,
  bindOrderFixture,
  seedCheckoutPayment,
  finalizeCheckoutFixture,
}
