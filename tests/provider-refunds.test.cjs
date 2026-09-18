const assert = require('node:assert/strict')
const crypto = require('node:crypto')
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
  'Razorpay refund reconciliation authorizes one identical replay only',
  { skip: !apiUrl || !serviceRoleKey },
  async (context) => {
    const client = serviceClient(apiUrl, serviceRoleKey)
    const order = await createOrderFixture(client)
    const payment = await createPaymentFixture(client, order)
    context.after(() => cleanupOrderFixture(client, order))

    const { data: operation, error: prepareError } = await client.rpc(
      'prepare_provider_operation',
      {
        p_provider: 'razorpay',
        p_operation_type: 'partial_refund',
        p_business_key: `partial-refund:${payment.paymentId}:${crypto.randomUUID()}`,
        p_order_id: order.orderId,
        p_payment_id: payment.paymentId,
        p_provider_target_type: 'payment',
        p_provider_target_id: payment.razorpayPaymentId,
        p_amount_paisa: 2_000,
        p_currency: 'INR',
        p_request_hash: 'e'.repeat(64),
        p_cause: 'One replay integration test',
      }
    )
    assert.ifError(prepareError)
    const lease = await claimLease(client, 'provider_operation', operation.id)
    assert.ifError(
      (
        await client.rpc('claim_provider_operation_dispatch', {
          ...lease,
          p_operation_id: operation.id,
        })
      ).error
    )
    assert.ifError(
      (
        await client.rpc('record_provider_operation_result', {
          ...lease,
          p_operation_id: operation.id,
          p_state: 'outcome_unknown',
          p_provider_operation_id: null,
          p_provider_status: null,
          p_response_metadata: { reconciliation: 'no_match' },
          p_error_classification: 'REFUND_NOT_FOUND',
          p_manual_review_reason: null,
        })
      ).error
    )
    const authorized = await client.rpc('authorize_razorpay_refund_retry', {
      ...lease,
      p_operation_id: operation.id,
    })
    assert.ifError(authorized.error)
    assert.equal(authorized.data.state, 'prepared')
    const duplicateAuthorization = await client.rpc('authorize_razorpay_refund_retry', {
      ...lease,
      p_operation_id: operation.id,
    })
    assert.equal(duplicateAuthorization.error?.code, '55P03')
  }
)
