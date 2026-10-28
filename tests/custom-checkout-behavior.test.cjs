const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { razorpay } = require('../server/dist/lib/razorpay/client.js')
const { inspectRetainedCheckoutProvider } = require('../server/dist/services/retainedCheckout.js')

const input = {
  razorpayOrderId: 'order_custom',
  amountPaisa: 49900,
  currency: 'INR',
  inspectPaymentAttempts: true,
}
const order = {
  id: 'order_custom',
  amount: 49900,
  amount_paid: 0,
  currency: 'INR',
  status: 'attempted',
}

test('custom checkout blocks retry while an attempt is authorized', async (t) => {
  t.mock.method(razorpay.orders, 'fetch', async () => order)
  t.mock.method(razorpay.orders, 'fetchPayments', async () => ({
    items: [
      {
        id: 'pay_custom',
        order_id: 'order_custom',
        amount: 49900,
        currency: 'INR',
        status: 'authorized',
        captured: false,
      },
    ],
  }))
  const result = await inspectRetainedCheckoutProvider(input)
  assert.equal(result.classification, 'pending')
})

test('custom checkout permits retry only after all attempts are confirmed failed', async (t) => {
  t.mock.method(razorpay.orders, 'fetch', async () => order)
  t.mock.method(razorpay.orders, 'fetchPayments', async () => ({
    items: [
      {
        id: 'pay_custom',
        order_id: 'order_custom',
        amount: 49900,
        currency: 'INR',
        status: 'failed',
        captured: false,
      },
    ],
  }))
  assert.equal((await inspectRetainedCheckoutProvider(input)).classification, 'payable')
})

test('custom checkout treats unavailable attempt inspection as unknown', async (t) => {
  t.mock.method(razorpay.orders, 'fetch', async () => order)
  t.mock.method(razorpay.orders, 'fetchPayments', async () => {
    throw new Error('provider unavailable')
  })
  assert.equal((await inspectRetainedCheckoutProvider(input)).classification, 'unavailable')
})

test('custom checkout rejects attempts with a different amount or order', async (t) => {
  t.mock.method(razorpay.orders, 'fetch', async () => order)
  t.mock.method(razorpay.orders, 'fetchPayments', async () => ({
    items: [
      {
        id: 'pay_custom',
        order_id: 'order_other',
        amount: 100,
        currency: 'INR',
        status: 'authorized',
      },
    ],
  }))
  assert.equal((await inspectRetainedCheckoutProvider(input)).classification, 'identity_mismatch')
})

test('a paid provider order without a matching captured payment never permits another attempt', async (t) => {
  t.mock.method(razorpay.orders, 'fetch', async () => ({
    ...order,
    status: 'paid',
    amount_paid: 49900,
  }))
  t.mock.method(razorpay.orders, 'fetchPayments', async () => ({ items: [] }))
  assert.equal((await inspectRetainedCheckoutProvider(input)).classification, 'pending')
})
