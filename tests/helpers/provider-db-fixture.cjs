const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { createClient } = require('../../server/node_modules/@supabase/supabase-js')

function serviceClient(apiUrl, serviceRoleKey) {
  return createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function createOrderFixture(client, input = {}) {
  const email = `provider-fixture-${crypto.randomUUID()}@example.com`
  const { data: identity, error: identityError } = await client.auth.admin.createUser({
    email,
    password: `Test-${crypto.randomUUID()}-9a!`,
    email_confirm: true,
  })
  assert.ifError(identityError)
  const orderId = crypto.randomUUID()
  const amountPaisa = input.amountPaisa ?? 10_000
  const { error: orderError } = await client.from('orders').insert({
    id: orderId,
    order_number: `TEST-${crypto.randomUUID()}`,
    user_id: identity.user.id,
    status: input.status ?? 'confirmed',
    payment_status: input.paymentStatus ?? 'paid',
    fulfillment_status: 'unfulfilled',
    contact_email: email,
    shipping_full_name: 'Provider Test',
    shipping_phone: '9876543210',
    shipping_address_line1: 'Test address',
    shipping_city: 'Mumbai',
    shipping_state: 'Maharashtra',
    shipping_pincode: '400001',
    subtotal_paisa: amountPaisa,
    total_amount_paisa: amountPaisa,
    billing_full_name: 'Provider Test',
    billing_address_line1: 'Test address',
    billing_city: 'Mumbai',
    billing_state: 'Maharashtra',
    billing_pincode: '400001',
    billing_country: 'India',
    checkout_expires_at: input.checkoutExpiresAt ?? null,
    shiprocket_order_id: input.shiprocketOrderId ?? null,
    shipment_id: input.shipmentId ?? null,
    awb_code: input.awbCode ?? null,
  })
  assert.ifError(orderError)
  return { userId: identity.user.id, orderId, amountPaisa, email }
}

async function createPaymentFixture(client, order, input = {}) {
  const paymentId = crypto.randomUUID()
  const razorpayOrderId = `order_${crypto.randomUUID().replaceAll('-', '')}`
  const razorpayPaymentId =
    input.razorpayPaymentId === null
      ? null
      : (input.razorpayPaymentId ?? `pay_${crypto.randomUUID().replaceAll('-', '')}`)
  const { error } = await client.from('payments').insert({
    id: paymentId,
    order_id: order.orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    amount_paisa: order.amountPaisa,
    currency: 'INR',
    status: input.status ?? 'captured',
    captured_at: (input.status ?? 'captured') === 'captured' ? new Date().toISOString() : null,
  })
  assert.ifError(error)
  return { paymentId, razorpayOrderId, razorpayPaymentId }
}

async function claimLease(client, scope, resourceId, leaseSeconds = 300) {
  const { data, error } = await client.rpc('claim_operation_lease', {
    p_scope: scope,
    p_resource_id: resourceId,
    p_lease_seconds: leaseSeconds,
    p_guard_type: null,
    p_guard_id: null,
    p_guard_token: null,
  })
  assert.ifError(error)
  assert.ok(data[0])
  return {
    p_execution_scope: scope,
    p_execution_resource_id: resourceId,
    p_execution_owner_token: data[0].owner_token,
    p_execution_fencing_token: data[0].fencing_token,
  }
}

async function cleanupOrderFixture(client, fixture) {
  await client.from('provider_operation_audit_log').delete().eq('order_id', fixture.orderId)
  await client.from('retained_checkout_action_log').delete().eq('order_id', fixture.orderId)
  await client.from('late_capture_watches').delete().eq('order_id', fixture.orderId)
  await client.from('retained_checkout_cases').delete().eq('order_id', fixture.orderId)
  await client.from('operational_alerts').delete().eq('order_id', fixture.orderId)
  await client.from('outbox_events').delete().eq('aggregate_id', fixture.orderId)
  await client.from('payment_logs').delete().eq('order_id', fixture.orderId)
  await client.from('order_status_history').delete().eq('order_id', fixture.orderId)
  await client.from('provider_operations').delete().eq('order_id', fixture.orderId)
  await client.from('payments').delete().eq('order_id', fixture.orderId)
  await client.from('orders').delete().eq('id', fixture.orderId)
  await client.auth.admin.deleteUser(fixture.userId)
}

module.exports = {
  claimLease,
  cleanupOrderFixture,
  createOrderFixture,
  createPaymentFixture,
  serviceClient,
}
