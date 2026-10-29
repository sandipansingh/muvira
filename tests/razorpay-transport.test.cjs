const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { razorpay } = require('../server/dist/lib/razorpay/client.js')

test('refund transport sends the documented replay header and keeps its body stable', async (t) => {
  const calls = []
  t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ id: 'rfnd_test', status: 'processed' }))
  })
  const body = { amount: 100, speed: 'normal', receipt: 'muvira-refund-123' }
  await razorpay.payments.refund('pay_test', body, 'muvira-refund-123')
  await razorpay.payments.refund('pay_test', body, 'muvira-refund-123')
  assert.equal(calls.length, 2)
  assert.equal(calls[0].options.headers['X-Refund-Idempotency'], body.receipt)
  assert.equal(calls[0].options.body, calls[1].options.body)
  assert.ok(calls[0].options.signal instanceof AbortSignal)
})
test('provider rejection exposes safe code/status and drops descriptions and transport secrets', async (t) => {
  t.mock.method(
    global,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'secret card data',
            reason: 'invalid_request',
          },
        }),
        { status: 401 }
      )
  )
  await assert.rejects(razorpay.orders.create({ amount: 100, currency: 'INR' }), (error) => {
    assert.equal(error.statusCode, 401)
    assert.equal(error.code, 'BAD_REQUEST_ERROR')
    assert.equal(error.definitive, true)
    assert.doesNotMatch(JSON.stringify(error), /secret card data|test-secret/)
    return true
  })
})
test('a lost transport response remains unknown and is never retried automatically', async (t) => {
  let calls = 0
  t.mock.method(global, 'fetch', async () => {
    calls++
    throw new TypeError('secret transport payload')
  })
  await assert.rejects(razorpay.orders.create({ amount: 100, currency: 'INR' }), (error) => {
    assert.equal(error.definitive, false)
    assert.equal(error.code, 'TRANSPORT_ERROR')
    assert.doesNotMatch(error.message, /secret/)
    return true
  })
  assert.equal(calls, 1)
})

test('the provider request deadline aborts an outstanding mutation after twenty seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(
    global,
    'fetch',
    async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
  )
  const pending = razorpay.orders.create({ amount: 100, currency: 'INR' })
  t.mock.timers.tick(20_000)
  await assert.rejects(
    pending,
    (error) => error.code === 'REQUEST_TIMEOUT' && error.definitive === false
  )
})
