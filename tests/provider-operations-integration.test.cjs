const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')

const apiUrl = process.env.SUPABASE_TEST_URL
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(apiUrl && serviceRoleKey)

Object.assign(process.env, {
  NODE_ENV: 'test',
  SUPABASE_URL: apiUrl ?? 'https://example.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_ANON_KEY ?? 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ?? 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_provider_operations',
  RAZORPAY_KEY_SECRET: 'provider-operations-secret',
  RAZORPAY_WEBHOOK_SECRET: 'provider-operations-webhook-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

function serviceClient() {
  return createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function createFixture(client, suffix, amountPaisa = 10_000) {
  const email = `provider-operations-${suffix}-${crypto.randomUUID()}@example.com`
  const { data: identity, error: identityError } = await client.auth.admin.createUser({
    email,
    password: `Test-${crypto.randomUUID()}-9a!`,
    email_confirm: true,
  })
  assert.ifError(identityError)
  const orderId = crypto.randomUUID()
  const paymentId = crypto.randomUUID()
  const razorpayPaymentId = `pay_${crypto.randomUUID().replaceAll('-', '')}`
  const { error: orderError } = await client.from('orders').insert({
    id: orderId,
    order_number: `TEST-${crypto.randomUUID()}`,
    user_id: identity.user.id,
    status: 'confirmed',
    payment_status: 'paid',
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
  })
  assert.ifError(orderError)
  const { error: paymentError } = await client.from('payments').insert({
    id: paymentId,
    order_id: orderId,
    razorpay_order_id: `order_${crypto.randomUUID().replaceAll('-', '')}`,
    razorpay_payment_id: razorpayPaymentId,
    amount_paisa: amountPaisa,
    currency: 'INR',
    status: 'captured',
    captured_at: new Date().toISOString(),
  })
  assert.ifError(paymentError)
  return { userId: identity.user.id, orderId, paymentId, razorpayPaymentId, amountPaisa }
}

function prepareArgs(fixture, overrides = {}) {
  return {
    p_provider: 'razorpay',
    p_operation_type: 'partial_refund',
    p_business_key: `partial-refund:${fixture.paymentId}:shared`,
    p_order_id: fixture.orderId,
    p_payment_id: fixture.paymentId,
    p_provider_target_type: 'payment',
    p_provider_target_id: fixture.razorpayPaymentId,
    p_amount_paisa: 4_000,
    p_currency: 'INR',
    p_request_hash: 'a'.repeat(64),
    p_cause: 'Provider operation integration test',
    ...overrides,
  }
}

async function claimLease(client, operationId) {
  const { data, error } = await client.rpc('claim_operation_lease', {
    p_scope: 'provider_operation',
    p_resource_id: operationId,
    p_lease_seconds: 30,
    p_guard_type: null,
    p_guard_id: null,
    p_guard_token: null,
  })
  assert.ifError(error)
  const lease = data[0]
  assert.ok(lease)
  return {
    p_execution_scope: 'provider_operation',
    p_execution_resource_id: operationId,
    p_execution_owner_token: lease.owner_token,
    p_execution_fencing_token: lease.fencing_token,
  }
}

test(
  'provider operation prepare races converge and stale finalizers are fenced',
  { skip: !shouldRun },
  async (context) => {
    const first = serviceClient()
    const second = serviceClient()
    const fixtures = []
    context.after(async () => {
      for (const fixture of fixtures.reverse()) {
        await first.from('provider_operation_audit_log').delete().eq('order_id', fixture.orderId)
        await first.from('operational_alerts').delete().eq('order_id', fixture.orderId)
        await first.from('outbox_events').delete().eq('aggregate_id', fixture.orderId)
        await first.from('payment_logs').delete().eq('order_id', fixture.orderId)
        await first.from('order_status_history').delete().eq('order_id', fixture.orderId)
        await first.from('provider_operations').delete().eq('order_id', fixture.orderId)
        await first.from('payments').delete().eq('order_id', fixture.orderId)
        await first.from('orders').delete().eq('id', fixture.orderId)
        await first.auth.admin.deleteUser(fixture.userId)
      }
    })

    const fixture = await createFixture(first, 'race')
    fixtures.push(fixture)
    const [left, right] = await Promise.all([
      first.rpc('prepare_provider_operation', prepareArgs(fixture)),
      second.rpc('prepare_provider_operation', prepareArgs(fixture)),
    ])
    assert.ifError(left.error)
    assert.ifError(right.error)
    assert.equal(left.data.id, right.data.id)
    assert.equal(left.data.idempotency_key, right.data.idempotency_key)
    const { count, error: countError } = await first
      .from('provider_operations')
      .select('id', { count: 'exact', head: true })
      .eq('business_key', prepareArgs(fixture).p_business_key)
    assert.ifError(countError)
    assert.equal(count, 1)

    const conflicting = await second.rpc(
      'prepare_provider_operation',
      prepareArgs(fixture, { p_amount_paisa: 4_001 })
    )
    assert.ok(conflicting.error)

    const aggregateFixture = await createFixture(first, 'aggregate')
    fixtures.push(aggregateFixture)
    const aggregateRace = await Promise.all([
      first.rpc(
        'prepare_provider_operation',
        prepareArgs(aggregateFixture, {
          p_business_key: `partial-refund:${aggregateFixture.paymentId}:${crypto.randomUUID()}`,
          p_amount_paisa: 6_000,
          p_request_hash: 'b'.repeat(64),
        })
      ),
      second.rpc(
        'prepare_provider_operation',
        prepareArgs(aggregateFixture, {
          p_business_key: `partial-refund:${aggregateFixture.paymentId}:${crypto.randomUUID()}`,
          p_amount_paisa: 6_000,
          p_request_hash: 'c'.repeat(64),
        })
      ),
    ])
    assert.equal(aggregateRace.filter((result) => !result.error).length, 1)
    assert.equal(aggregateRace.filter((result) => result.error?.code === '23514').length, 1)

    const operation = left.data
    const staleLease = await claimLease(first, operation.id)
    const claimed = await first.rpc('claim_provider_operation_dispatch', {
      ...staleLease,
      p_operation_id: operation.id,
    })
    assert.ifError(claimed.error)
    const succeeded = await first.rpc('record_provider_operation_result', {
      ...staleLease,
      p_operation_id: operation.id,
      p_state: 'provider_succeeded',
      p_provider_operation_id: `rfnd_${crypto.randomUUID().replaceAll('-', '')}`,
      p_provider_status: 'processed',
      p_response_metadata: { source: 'fake_adapter' },
      p_error_classification: null,
      p_manual_review_reason: null,
    })
    assert.ifError(succeeded.error)

    const { error: expireError } = await first
      .from('operation_leases')
      .update({ lease_expires_at: new Date(Date.now() - 1_000).toISOString() })
      .eq('scope', 'provider_operation')
      .eq('resource_id', operation.id)
    assert.ifError(expireError)
    const currentLease = await claimLease(second, operation.id)
    const finalizerArgs = {
      p_operation_id: operation.id,
      p_provider_target_type: operation.provider_target_type,
      p_provider_target_id: operation.provider_target_id,
      p_payment_id: operation.payment_id,
      p_amount_paisa: operation.amount_paisa,
      p_currency: operation.currency,
      p_request_hash: operation.request_hash,
    }
    const staleFinalize = await first.rpc('finalize_provider_operation', {
      ...staleLease,
      ...finalizerArgs,
    })
    assert.equal(staleFinalize.error?.code, '55P03')
    const finalized = await second.rpc('finalize_provider_operation', {
      ...currentLease,
      ...finalizerArgs,
    })
    assert.ifError(finalized.error)
    assert.ok(finalized.data.local_applied_at)
    const repeated = await second.rpc('finalize_provider_operation', {
      ...currentLease,
      ...finalizerArgs,
    })
    assert.ifError(repeated.error)
    const { count: logCount } = await first
      .from('payment_logs')
      .select('id', { count: 'exact', head: true })
      .eq('payment_id', fixture.paymentId)
      .eq('event_type', 'refund_processed')
    assert.equal(logCount, 1)

    const { data: payment } = await first
      .from('payments')
      .select('status, refunded_amount_paisa')
      .eq('id', fixture.paymentId)
      .single()
    assert.equal(payment.status, 'captured')
    assert.equal(payment.refunded_amount_paisa, 4_000)

    const adapterFixture = await createFixture(first, 'fake-adapter')
    fixtures.push(adapterFixture)
    const prepared = await first.rpc(
      'prepare_provider_operation',
      prepareArgs(adapterFixture, {
        p_business_key: `partial-refund:${adapterFixture.paymentId}:${crypto.randomUUID()}`,
        p_amount_paisa: 2_500,
        p_request_hash: 'd'.repeat(64),
      })
    )
    assert.ifError(prepared.error)
    const { dispatchRazorpayRefund } = require('../server/dist/services/providerOperations.js')
    let mutationCalls = 0
    let lookupCalls = 0
    const remoteRefund = {
      id: `rfnd_${crypto.randomUUID().replaceAll('-', '')}`,
      payment_id: adapterFixture.razorpayPaymentId,
      amount: 2_500,
      currency: 'INR',
      receipt: prepared.data.idempotency_key,
      status: 'processed',
    }
    const recovered = await dispatchRazorpayRefund(prepared.data.id, {
      async mutate() {
        mutationCalls += 1
        throw new Error('Simulated lost response after remote success')
      },
      async reconcile() {
        lookupCalls += 1
        return remoteRefund
      },
    })
    assert.equal(mutationCalls, 1)
    assert.equal(lookupCalls, 1)
    assert.equal(recovered.state, 'provider_succeeded')
    assert.ok(recovered.local_applied_at)
  }
)
