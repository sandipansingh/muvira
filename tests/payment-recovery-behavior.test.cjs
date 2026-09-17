const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { once } = require('node:events')
const test = require('node:test')

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  LOG_LEVEL: 'fatal',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_example',
  RAZORPAY_KEY_SECRET: 'payment-signature-secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook-signature-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const { razorpay } = require('../server/dist/lib/razorpay/client.js')
const {
  enqueueRazorpayWebhookRetry,
  processStoredRazorpayWebhook,
  recordPaymentReconciliation,
  verifyPayment,
} = require('../server/dist/modules/payments/service.js')
const {
  cancelCheckout,
  createCheckoutOrder,
  expireAbandonedCheckouts,
} = require('../server/dist/modules/checkout/service.js')
const { runClaimedRetryJob } = require('../server/dist/services/retryWorker.js')
const { createApp } = require('../server/dist/app.js')
const diagnosticsService = require('../server/dist/modules/admin/diagnostics/service.js')

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function paymentPayload(event, payment) {
  return {
    event,
    payload: {
      payment: {
        entity: payment,
      },
    },
  }
}

function paymentQuery(localPayment) {
  const result = { data: localPayment, error: null }
  const builder = {
    select: () => builder,
    eq: () => builder,
    single: async () => result,
    maybeSingle: async () => result,
  }
  return builder
}

let executionLeaseSequence = 0
function executionLeaseRpc(name, args = {}) {
  if (name === 'claim_operation_lease') {
    executionLeaseSequence += 1
    return {
      data: [
        {
          scope: args.p_scope,
          resource_id: args.p_resource_id,
          owner_token: `00000000-0000-4000-8000-${String(executionLeaseSequence).padStart(12, '0')}`,
          fencing_token: executionLeaseSequence,
        },
      ],
      error: null,
    }
  }
  if (name === 'renew_operation_lease' || name === 'release_operation_lease') {
    return { data: true, error: null }
  }
  return null
}

test('a failed attempt racing a capture never releases reservations', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const originalPaymentFetch = razorpay.payments.fetch
  const originalOrderFetch = razorpay.orders.fetch
  const orderFetchStarted = deferred()
  const captureFinalized = deferred()
  const localPayment = {
    id: 'payment-local-1',
    order_id: 'order-local-1',
    razorpay_order_id: 'order-provider-1',
    amount_paisa: 12500,
    currency: 'INR',
    status: 'created',
  }
  const events = new Map([
    [
      'event-failed',
      {
        id: 'event-failed',
        status: 'verified',
        token: null,
        payload: paymentPayload('payment.failed', {
          id: 'pay-failed',
          order_id: 'order-provider-1',
          amount: 12500,
          currency: 'INR',
          status: 'failed',
          captured: false,
          method: 'upi',
          error_description: 'Attempt failed',
        }),
      },
    ],
    [
      'event-captured',
      {
        id: 'event-captured',
        status: 'verified',
        token: null,
        payload: paymentPayload('payment.captured', {
          id: 'pay-captured',
          order_id: 'order-provider-1',
          amount: 12500,
          currency: 'INR',
          status: 'captured',
          captured: true,
          method: 'upi',
        }),
      },
    ],
  ])
  let failCheckoutCalls = 0
  let reservationStatus = 'reserved'
  let orderPaymentStatus = 'pending'

  adminSupabase.from = (relation) => {
    assert.equal(relation, 'payments')
    return paymentQuery(localPayment)
  }
  adminSupabase.rpc = async (name, args) => {
    const leaseResult = executionLeaseRpc(name, args)
    if (leaseResult) return leaseResult
    if (name === 'claim_razorpay_webhook') {
      const event = events.get(args.p_webhook_id)
      if (!event || event.status === 'processing' || event.status === 'processed') {
        return { data: [], error: null }
      }
      event.status = 'processing'
      event.token = `token-${event.id}`
      return {
        data: [
          {
            id: event.id,
            raw_payload: event.payload,
            processing_token: event.token,
          },
        ],
        error: null,
      }
    }
    if (name === 'renew_razorpay_webhook_lease') {
      const event = events.get(args.p_webhook_id)
      return {
        data: event?.status === 'processing' && event.token === args.p_processing_token,
        error: null,
      }
    }
    if (name === 'complete_razorpay_webhook') {
      const event = events.get(args.p_webhook_id)
      const owned = event?.status === 'processing' && event.token === args.p_processing_token
      if (owned) event.status = 'processed'
      return { data: owned, error: null }
    }
    if (name === 'fail_razorpay_webhook') {
      const event = events.get(args.p_webhook_id)
      const owned = event?.status === 'processing' && event.token === args.p_processing_token
      if (owned) event.status = 'failed'
      return { data: owned, error: null }
    }
    if (name === 'finalize_captured_payment_fenced') {
      localPayment.status = 'captured'
      reservationStatus = 'committed'
      orderPaymentStatus = 'paid'
      captureFinalized.resolve()
      return {
        data: {
          already_captured: false,
          order: { id: localPayment.order_id, user_id: 'user-1' },
        },
        error: null,
      }
    }
    if (name === 'fail_checkout_fenced') {
      failCheckoutCalls += 1
      reservationStatus = 'released'
      orderPaymentStatus = 'failed'
      return { data: true, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }
  razorpay.payments.fetch = async (paymentId) => ({
    id: paymentId,
    order_id: localPayment.razorpay_order_id,
    amount: localPayment.amount_paisa,
    currency: localPayment.currency,
    status: 'failed',
    captured: false,
    method: 'upi',
  })
  razorpay.orders.fetch = async () => {
    orderFetchStarted.resolve()
    await captureFinalized.promise
    return {
      id: localPayment.razorpay_order_id,
      amount: localPayment.amount_paisa,
      amount_paid: localPayment.amount_paisa,
      currency: localPayment.currency,
      status: 'paid',
    }
  }

  try {
    const failedProcessing = processStoredRazorpayWebhook('event-failed')
    await orderFetchStarted.promise
    const capturedProcessing = processStoredRazorpayWebhook('event-captured')
    await Promise.all([failedProcessing, capturedProcessing])

    assert.equal(failCheckoutCalls, 0)
    assert.equal(reservationStatus, 'committed')
    assert.equal(orderPaymentStatus, 'paid')
    assert.equal(events.get('event-failed').status, 'processed')
    assert.equal(events.get('event-captured').status, 'processed')
  } finally {
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
    razorpay.payments.fetch = originalPaymentFetch
    razorpay.orders.fetch = originalOrderFetch
  }
})

test('concurrent processors cannot execute the same stored webhook twice', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const finalizationStarted = deferred()
  const releaseFinalization = deferred()
  const payload = paymentPayload('payment.captured', {
    id: 'pay-captured-once',
    order_id: 'order-provider-once',
    amount: 9000,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  })
  let status = 'verified'
  let token = null
  let finalizationCalls = 0

  adminSupabase.from = (relation) => {
    assert.equal(relation, 'payments')
    return paymentQuery({
      id: 'payment-local-once',
      order_id: 'order-local-once',
      razorpay_order_id: 'order-provider-once',
      amount_paisa: 9000,
      currency: 'INR',
      status: 'created',
    })
  }
  adminSupabase.rpc = async (name, args) => {
    const leaseResult = executionLeaseRpc(name, args)
    if (leaseResult) return leaseResult
    if (name === 'claim_razorpay_webhook') {
      if (status !== 'verified') return { data: [], error: null }
      status = 'processing'
      token = 'only-owner-token'
      return {
        data: [{ id: 'event-once', raw_payload: payload, processing_token: token }],
        error: null,
      }
    }
    if (name === 'renew_razorpay_webhook_lease') {
      return { data: status === 'processing' && args.p_processing_token === token, error: null }
    }
    if (name === 'finalize_captured_payment_fenced') {
      finalizationCalls += 1
      finalizationStarted.resolve()
      await releaseFinalization.promise
      return {
        data: {
          already_captured: false,
          order: { id: 'order-local-once', user_id: 'user-1' },
        },
        error: null,
      }
    }
    if (name === 'complete_razorpay_webhook') {
      const owned = status === 'processing' && args.p_processing_token === token
      if (owned) status = 'processed'
      return { data: owned, error: null }
    }
    if (name === 'fail_razorpay_webhook') return { data: false, error: null }
    throw new Error(`Unexpected RPC: ${name}`)
  }

  try {
    const first = processStoredRazorpayWebhook('event-once')
    await finalizationStarted.promise
    const second = processStoredRazorpayWebhook('event-once')
    await second
    releaseFinalization.resolve()
    await first

    assert.equal(finalizationCalls, 1)
    assert.equal(status, 'processed')
  } finally {
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
  }
})

test('reconciliation and webhook enqueue retry transient persistence failures', async () => {
  const originalRpc = adminSupabase.rpc
  let reconciliationAttempts = 0
  let enqueueAttempts = 0

  adminSupabase.rpc = async (name) => {
    const leaseResult = executionLeaseRpc(name)
    if (leaseResult) return leaseResult
    if (name === 'record_payment_reconciliation') {
      reconciliationAttempts += 1
      if (reconciliationAttempts === 1) throw new Error('injected transport failure')
      return {
        data: reconciliationAttempts === 3 ? { id: 'case-1' } : null,
        error: reconciliationAttempts === 3 ? null : { message: 'temporary write failure' },
      }
    }
    if (name === 'enqueue_retry_job') {
      enqueueAttempts += 1
      if (enqueueAttempts === 1) throw new Error('injected transport failure')
      return {
        data: enqueueAttempts === 3 ? 'job-1' : null,
        error: enqueueAttempts === 3 ? null : { message: 'temporary enqueue failure' },
      }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }

  try {
    assert.equal(
      await recordPaymentReconciliation({
        orderId: 'order-reconcile',
        paymentId: 'payment-reconcile',
        razorpayOrderId: 'order-provider-reconcile',
        razorpayPaymentId: 'pay-provider-reconcile',
        providerAmount: 20000,
        providerCurrency: 'INR',
        reason: 'Injected local finalization failure',
      }),
      true
    )
    assert.equal(await enqueueRazorpayWebhookRetry('event-retry'), true)
    assert.equal(reconciliationAttempts, 3)
    assert.equal(enqueueAttempts, 3)
  } finally {
    adminSupabase.rpc = originalRpc
  }
})

test('an inconsistent provider order preserves its early ID when reconciliation storage fails', async () => {
  const originalRpc = adminSupabase.rpc
  const originalOrderCreate = razorpay.orders.create
  const reconciliationInputs = []
  let releaseCalls = 0

  adminSupabase.rpc = async (name, args) => {
    const leaseResult = executionLeaseRpc(name, args)
    if (leaseResult) return leaseResult
    if (name === 'expire_abandoned_checkouts') return { data: 0, error: null }
    if (name === 'initialize_checkout') {
      return {
        data: {
          order: {
            id: 'order-orphan',
            order_number: 'TST-ORPHAN',
            total_amount_paisa: 15000,
            checkout_expires_at: '2099-01-01T00:00:00.000Z',
          },
        },
        error: null,
      }
    }
    if (name === 'record_payment_reconciliation') {
      reconciliationInputs.push(args)
      return { data: null, error: { message: 'injected reconciliation outage' } }
    }
    if (name === 'persist_operational_alert') {
      return { data: { id: 'alert-orphan' }, error: null }
    }
    if (name === 'fail_checkout_fenced') {
      releaseCalls += 1
      return { data: true, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }
  razorpay.orders.create = async () => ({
    id: 'order_provider_orphan',
    amount: 14999,
    currency: 'USD',
    status: 'created',
  })

  try {
    await assert.rejects(
      createCheckoutOrder('user-orphan', {
        address_id: '35ea34cb-c9a9-4377-bbea-23b1ca0dce61',
        shipping_method: 'standard',
        billing_same_as_shipping: true,
      }),
      (error) => error.code === 'PAYMENT_RECONCILIATION_REQUIRED' && error.statusCode === 503
    )
    assert.equal(reconciliationInputs.length, 3)
    assert.equal(reconciliationInputs[0].p_razorpay_order_id, 'order_provider_orphan')
    assert.equal(releaseCalls, 0)
  } finally {
    adminSupabase.rpc = originalRpc
    razorpay.orders.create = originalOrderCreate
  }
})

test('captured finalization cannot report normal reconciliation when case persistence fails', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const originalPaymentFetch = razorpay.payments.fetch
  const originalOrderFetch = razorpay.orders.fetch
  const providerOrderId = 'order_finalize_failure'
  const providerPaymentId = 'pay_finalize_failure'
  let reconciliationAttempts = 0

  adminSupabase.from = (relation) => {
    if (relation === 'payments') {
      return paymentQuery({
        id: 'payment-finalize-failure',
        order_id: 'order-finalize-failure',
        razorpay_order_id: providerOrderId,
        amount_paisa: 22000,
        currency: 'INR',
        status: 'created',
      })
    }
    if (relation === 'orders') {
      return paymentQuery({ user_id: 'user-finalize-failure' })
    }
    if (relation === 'payment_logs') {
      return { insert: async () => ({ error: null }) }
    }
    throw new Error(`Unexpected relation: ${relation}`)
  }
  adminSupabase.rpc = async (name) => {
    const leaseResult = executionLeaseRpc(name)
    if (leaseResult) return leaseResult
    if (name === 'finalize_captured_payment_fenced') {
      return { data: null, error: { message: 'injected local persistence failure' } }
    }
    if (name === 'record_payment_reconciliation') {
      reconciliationAttempts += 1
      return { data: null, error: { message: 'injected reconciliation failure' } }
    }
    if (name === 'persist_operational_alert') {
      return { data: { id: 'alert-finalization' }, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }
  razorpay.payments.fetch = async () => ({
    id: providerPaymentId,
    order_id: providerOrderId,
    amount: 22000,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  })
  razorpay.orders.fetch = async () => ({
    id: providerOrderId,
    amount: 22000,
    amount_paid: 22000,
    currency: 'INR',
    status: 'paid',
  })
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex')

  try {
    await assert.rejects(
      verifyPayment('user-finalize-failure', {
        razorpay_order_id: providerOrderId,
        razorpay_payment_id: providerPaymentId,
        razorpay_signature: signature,
      }),
      (error) =>
        error.code === 'PAYMENT_RECONCILIATION_PERSISTENCE_FAILED' && error.statusCode === 503
    )
    assert.equal(reconciliationAttempts, 3)
  } finally {
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
    razorpay.payments.fetch = originalPaymentFetch
    razorpay.orders.fetch = originalOrderFetch
  }
})

test('captured provider-state mismatch creates reconciliation before returning', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const originalPaymentFetch = razorpay.payments.fetch
  const originalOrderFetch = razorpay.orders.fetch
  const providerOrderId = 'order_captured_mismatch'
  const providerPaymentId = 'pay_captured_mismatch'
  let reconciliationInput

  adminSupabase.from = (relation) => {
    if (relation === 'payments') {
      return paymentQuery({
        id: 'payment-captured-mismatch',
        order_id: 'order-captured-mismatch',
        razorpay_order_id: providerOrderId,
        amount_paisa: 33000,
        currency: 'INR',
        status: 'created',
      })
    }
    if (relation === 'orders') return paymentQuery({ user_id: 'user-captured-mismatch' })
    if (relation === 'payment_logs') return { insert: async () => ({ error: null }) }
    throw new Error(`Unexpected relation: ${relation}`)
  }
  adminSupabase.rpc = async (name, args) => {
    const leaseResult = executionLeaseRpc(name, args)
    if (leaseResult) return leaseResult
    if (name === 'record_payment_reconciliation') {
      reconciliationInput = args
      return { data: { id: 'case-captured-mismatch' }, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }
  razorpay.payments.fetch = async () => ({
    id: providerPaymentId,
    order_id: providerOrderId,
    amount: 32999,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  })
  razorpay.orders.fetch = async () => ({
    id: providerOrderId,
    amount: 33000,
    amount_paid: 32999,
    currency: 'INR',
    status: 'paid',
  })
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex')

  try {
    await assert.rejects(
      verifyPayment('user-captured-mismatch', {
        razorpay_order_id: providerOrderId,
        razorpay_payment_id: providerPaymentId,
        razorpay_signature: signature,
      }),
      (error) => error.code === 'PAYMENT_RECONCILIATION_REQUIRED' && error.statusCode === 409
    )
    assert.equal(reconciliationInput.p_order_id, 'order-captured-mismatch')
    assert.equal(reconciliationInput.p_razorpay_payment_id, providerPaymentId)
  } finally {
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
    razorpay.payments.fetch = originalPaymentFetch
    razorpay.orders.fetch = originalOrderFetch
  }
})

test('retry worker renews its lease while a slow handler is still running', async () => {
  const originalRpc = adminSupabase.rpc
  const handlerStarted = deferred()
  const finishHandler = deferred()
  let renewals = 0
  let completions = 0
  let failures = 0

  adminSupabase.rpc = async (name) => {
    const leaseResult = executionLeaseRpc(name)
    if (leaseResult) return leaseResult
    if (name === 'renew_retry_job_lease') {
      renewals += 1
      return { data: true, error: null }
    }
    if (name === 'complete_retry_job') {
      completions += 1
      return { data: true, error: null }
    }
    if (name === 'fail_retry_job') {
      failures += 1
      return { data: {}, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }

  try {
    const running = runClaimedRetryJob(
      {
        id: 'job-slow',
        job_type: 'razorpay_webhook',
        reference_id: 'event-slow',
        payload: {},
        lease_token: 'lease-slow',
      },
      async () => {
        handlerStarted.resolve()
        await finishHandler.promise
      },
      { heartbeatMs: 5, leaseSeconds: 30 }
    )

    await handlerStarted.promise
    await new Promise((resolve) => setTimeout(resolve, 18))
    finishHandler.resolve()

    assert.equal(await running, true)
    assert.ok(renewals >= 3)
    assert.equal(completions, 1)
    assert.equal(failures, 0)
  } finally {
    adminSupabase.rpc = originalRpc
  }
})

test('expired payable checkout retains reservations and a later capture commits them', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const originalOrderFetch = razorpay.orders.fetch
  let reservationStatus = 'reserved'
  let orderPaymentStatus = 'pending'
  let checkoutExpiry = '2026-09-17T00:00:00.000Z'
  const localPayment = {
    id: 'payment-expiry-race',
    order_id: 'order-expiry-race',
    razorpay_order_id: 'order_provider_expiry_race',
    amount_paisa: 18900,
    currency: 'INR',
    status: 'created',
  }
  const webhookPayload = paymentPayload('payment.captured', {
    id: 'pay_expiry_race',
    order_id: localPayment.razorpay_order_id,
    amount: localPayment.amount_paisa,
    currency: localPayment.currency,
    status: 'captured',
    captured: true,
    method: 'upi',
  })
  let webhookStatus = 'verified'
  let webhookToken = null

  adminSupabase.from = (relation) => {
    if (relation === 'orders') {
      const result = {
        data: [
          {
            id: localPayment.order_id,
            payments: [
              {
                razorpay_order_id: localPayment.razorpay_order_id,
                amount_paisa: localPayment.amount_paisa,
                currency: localPayment.currency,
              },
            ],
          },
        ],
        error: null,
      }
      const builder = {
        select: () => builder,
        eq: () => builder,
        lt: () => builder,
        limit: async () => result,
      }
      return builder
    }
    if (relation === 'payments') return paymentQuery(localPayment)
    throw new Error(`Unexpected relation: ${relation}`)
  }

  adminSupabase.rpc = async (name, args) => {
    const leaseResult = executionLeaseRpc(name, args)
    if (leaseResult) return leaseResult
    if (name === 'expire_abandoned_checkouts') return { data: 0, error: null }
    if (name === 'retain_payable_checkout_fenced') {
      assert.equal(args.p_provider_status, 'attempted')
      assert.equal(args.p_provider_amount_paid, 0)
      assert.equal(reservationStatus, 'reserved')
      checkoutExpiry = '2026-09-17T00:15:00.000Z'
      return { data: true, error: null }
    }
    if (name === 'claim_razorpay_webhook') {
      if (webhookStatus !== 'verified') return { data: [], error: null }
      webhookStatus = 'processing'
      webhookToken = 'webhook-expiry-race-token'
      return {
        data: [
          {
            id: 'webhook-expiry-race',
            raw_payload: webhookPayload,
            processing_token: webhookToken,
          },
        ],
        error: null,
      }
    }
    if (name === 'renew_razorpay_webhook_lease') {
      return {
        data: webhookStatus === 'processing' && args.p_processing_token === webhookToken,
        error: null,
      }
    }
    if (name === 'finalize_captured_payment_fenced') {
      assert.equal(reservationStatus, 'reserved')
      reservationStatus = 'committed'
      orderPaymentStatus = 'paid'
      localPayment.status = 'captured'
      return {
        data: {
          already_captured: false,
          order: { id: localPayment.order_id, user_id: 'user-expiry-race' },
        },
        error: null,
      }
    }
    if (name === 'complete_razorpay_webhook') {
      webhookStatus = 'processed'
      return { data: true, error: null }
    }
    if (name === 'fail_razorpay_webhook') return { data: false, error: null }
    throw new Error(`Unexpected RPC: ${name}`)
  }
  razorpay.orders.fetch = async () => ({
    id: localPayment.razorpay_order_id,
    amount: localPayment.amount_paisa,
    amount_paid: 0,
    currency: localPayment.currency,
    status: 'attempted',
  })

  try {
    assert.deepEqual(await expireAbandonedCheckouts(10), { released: 0, retained: 1 })
    assert.equal(reservationStatus, 'reserved')
    assert.equal(checkoutExpiry, '2026-09-17T00:15:00.000Z')

    await processStoredRazorpayWebhook('webhook-expiry-race')
    assert.equal(reservationStatus, 'committed')
    assert.equal(orderPaymentStatus, 'paid')
    assert.equal(webhookStatus, 'processed')
  } finally {
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
    razorpay.orders.fetch = originalOrderFetch
  }
})

test('retry effect write is rejected when its parent job lease is lost mid-handler', async () => {
  const originalRpc = adminSupabase.rpc
  const handlerStarted = deferred()
  const renewalFailed = deferred()
  const attemptMutation = deferred()
  const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  let currentJobToken = 'retry-lease-owner-a'
  let retryRenewals = 0
  let mutationCommitted = false

  adminSupabase.rpc = async (name, args) => {
    if (name === 'renew_retry_job_lease') {
      retryRenewals += 1
      if (retryRenewals >= 2) {
        currentJobToken = 'retry-lease-owner-b'
        renewalFailed.resolve()
        return { data: false, error: null }
      }
      return { data: true, error: null }
    }
    if (name === 'claim_operation_lease') {
      assert.equal(args.p_guard_type, 'retry_job')
      assert.equal(args.p_guard_id, 'job-reclaimed-mid-handler')
      assert.equal(args.p_guard_token, 'retry-lease-owner-a')
      return {
        data: [
          {
            scope: args.p_scope,
            resource_id: args.p_resource_id,
            owner_token: ownerA,
            fencing_token: 1,
          },
        ],
        error: null,
      }
    }
    if (name === 'renew_operation_lease') {
      return { data: true, error: null }
    }
    if (name === 'persist_operational_alert_fenced') {
      if (currentJobToken !== 'retry-lease-owner-a') {
        return {
          data: null,
          error: { code: '55P03', message: 'Execution lease is no longer owned' },
        }
      }
      mutationCommitted = true
      return { data: { id: 'should-not-exist' }, error: null }
    }
    if (name === 'release_operation_lease') return { data: false, error: null }
    if (name === 'fail_retry_job') return { data: {}, error: null }
    if (name === 'complete_retry_job') return { data: true, error: null }
    throw new Error(`Unexpected RPC: ${name}`)
  }

  try {
    const running = runClaimedRetryJob(
      {
        id: 'job-reclaimed-mid-handler',
        job_type: 'shiprocket_persist',
        reference_id: 'order-reclaimed-mid-handler',
        payload: {},
        lease_token: 'retry-lease-owner-a',
      },
      async (_payload, _referenceId, executionLease) => {
        handlerStarted.resolve()
        await attemptMutation.promise
        const result = await adminSupabase.rpc('persist_operational_alert_fenced', {
          p_execution_scope: executionLease.scope,
          p_execution_resource_id: executionLease.resourceId,
          p_execution_owner_token: executionLease.ownerToken,
          p_execution_fencing_token: executionLease.fencingToken,
        })
        if (result.error) throw new Error(result.error.message)
      },
      { heartbeatMs: 5, leaseSeconds: 30 }
    )

    await handlerStarted.promise
    await new Promise((resolve) => setTimeout(resolve, 18))
    await renewalFailed.promise
    attemptMutation.resolve()

    assert.equal(await running, false)
    assert.equal(mutationCommitted, false)
    assert.equal(currentJobToken, 'retry-lease-owner-b')
  } finally {
    adminSupabase.rpc = originalRpc
  }
})

test('webhook enqueue exhaustion returns 503 and remains visible to admin diagnostics', async () => {
  const originalRpc = adminSupabase.rpc
  const originalFrom = adminSupabase.from
  const eventId = '55555555-5555-4555-8555-555555555555'
  const providerEventId = 'evt_enqueue_exhaustion'
  let storedEvent = null
  let enqueueAttempts = 0
  let persistedAlert = null

  adminSupabase.from = (relation) => {
    assert.equal(relation, 'webhook_events')
    return {
      insert: (values) => {
        storedEvent = {
          id: eventId,
          ...values,
          retry_count: 0,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        return {
          select: () => ({ single: async () => ({ data: { id: eventId }, error: null }) }),
        }
      },
      select: () => {
        const builder = {
          order: () => builder,
          eq: () => builder,
          range: () => builder,
          then: (resolve) =>
            resolve({
              data: storedEvent ? [storedEvent] : [],
              error: null,
              count: storedEvent ? 1 : 0,
            }),
        }
        return builder
      },
    }
  }

  adminSupabase.rpc = async (name, args) => {
    if (name === 'get_runtime_schema_status') {
      return {
        data: {
          contract_version: 43,
          migration_version: '043',
          ready: true,
          missing_relations: [],
          missing_columns: [],
          missing_functions: [],
          invalid_relation_grants: [],
          invalid_function_grants: [],
          missing_constraints: [],
          invalid_rls_relations: [],
          missing_indexes: [],
          invalid_storage_capabilities: [],
        },
        error: null,
      }
    }
    if (name === 'claim_razorpay_webhook') {
      storedEvent.processing_status = 'processing'
      return {
        data: [
          {
            id: eventId,
            raw_payload: storedEvent.raw_payload,
            processing_token: 'enqueue-exhaustion-token',
          },
        ],
        error: null,
      }
    }
    if (name === 'renew_razorpay_webhook_lease') return { data: true, error: null }
    if (name === 'fail_razorpay_webhook') {
      storedEvent.processing_status = 'failed'
      storedEvent.retry_count += 1
      storedEvent.error_message = args.p_error
      storedEvent.updated_at = new Date().toISOString()
      return { data: true, error: null }
    }
    if (name === 'enqueue_retry_job') {
      enqueueAttempts += 1
      return { data: null, error: { message: 'injected queue outage' } }
    }
    if (name === 'persist_operational_alert') {
      persistedAlert = args
      return { data: { id: 'alert-enqueue-exhaustion' }, error: null }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  }

  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }))
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  const server = createApp().listen(0)
  await once(server, 'listening')
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    const response = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': providerEventId,
      },
      body: rawBody,
    })
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.error.code, 'WEBHOOK_RETRY_UNAVAILABLE')
    assert.equal(enqueueAttempts, 3)
    assert.equal(storedEvent.processing_status, 'failed')
    assert.equal(persistedAlert.p_webhook_event_id, eventId)

    const visible = await diagnosticsService.getWebhookLogs({
      page: 1,
      limit: 20,
      source: 'razorpay',
      status: 'failed',
    })
    assert.equal(visible.total, 1)
    assert.equal(visible.logs[0].id, eventId)
    assert.equal(visible.logs[0].processing_status, 'failed')
  } finally {
    server.close()
    await once(server, 'close')
    adminSupabase.rpc = originalRpc
    adminSupabase.from = originalFrom
  }
})
