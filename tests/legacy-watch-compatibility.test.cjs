require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
require('./helpers/test-env.cjs').configureTestEnvironment()
const assert = require('node:assert/strict')
const test = require('node:test')
const {
  serviceClient,
  createOrderFixture,
  createPaymentFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')
test(
  'compatibility API preserves unbound legacy watches without using current credentials',
  { skip: process.env.RUN_LEGACY_WATCH_CHECK !== 'true' },
  async (t) => {
    const client = serviceClient(
      process.env.SUPABASE_TEST_URL,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
    )
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
          reason: 'Compatibility check',
        })
      ).error
    )
    const { razorpay } = require('../server/dist/lib/razorpay/client.js'),
      original = razorpay.orders.fetch
    let inspected = 0
    t.after(() => {
      razorpay.orders.fetch = original
    })
    razorpay.orders.fetch = async (id) => {
      inspected++
      return { id, amount: fixture.amountPaisa, currency: 'INR', status: 'created' }
    }
    const { processLateCaptureWatches } = require('../server/dist/services/providerOperations.js')
    await processLateCaptureWatches()
    assert.equal(inspected, 0)
    const retained = await client
      .from('late_capture_watches')
      .select('razorpay_order_id')
      .eq('order_id', fixture.orderId)
      .single()
    assert.ifError(retained.error)
    assert.equal(retained.data.razorpay_order_id, payment.razorpayOrderId)
  }
)
