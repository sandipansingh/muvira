const assert = require('node:assert/strict')
const test = require('node:test')

require('./helpers/test-env.cjs').configureTestEnvironment()
const importedCron = require('../server/node_modules/node-cron')
const cron = importedCron.default ?? importedCron
const scheduler = require('../server/dist/services/pollingScheduler.js')
const checkout = require('../server/dist/modules/checkout/service.js')
const retained = require('../server/dist/services/retainedCheckout.js')

function expiryCallback(t) {
  const callbacks = []
  t.mock.method(cron, 'schedule', (_expression, callback) => {
    callbacks.push(callback)
    return { stop() {} }
  })
  scheduler.startPollingScheduler()
  t.after(scheduler.stopPollingScheduler)
  return callbacks[3]
}

test('checkout expiry skips overlapping callbacks and resumes after the active callback completes', async (t) => {
  let release
  const active = new Promise((resolve) => {
    release = resolve
  })
  let calls = 0
  t.mock.method(checkout, 'expireAbandonedCheckouts', async () => {
    calls += 1
    if (calls === 1) await active
    return { released: 0, retained: 0 }
  })
  t.mock.method(retained, 'processLateCaptureWatches', async () => 0)
  const run = expiryCallback(t)
  const first = run()
  await run()
  assert.equal(calls, 1)
  release()
  await first
  await run()
  assert.equal(calls, 2)
})

test('late capture watches still run when checkout expiry fails', async (t) => {
  t.mock.method(checkout, 'expireAbandonedCheckouts', async () => {
    throw new Error('Database unavailable')
  })
  let watches = 0
  t.mock.method(retained, 'processLateCaptureWatches', async () => {
    watches += 1
  })
  const run = expiryCallback(t)
  await assert.doesNotReject(run())
  assert.equal(watches, 1)
})

test('late capture failures are contained and do not block subsequent expiry callbacks', async (t) => {
  let expiries = 0
  t.mock.method(checkout, 'expireAbandonedCheckouts', async () => {
    expiries += 1
    return { released: 2, retained: 1 }
  })
  t.mock.method(retained, 'processLateCaptureWatches', async () => {
    throw new Error('Watch lookup unavailable')
  })
  const run = expiryCallback(t)
  await assert.doesNotReject(run())
  await assert.doesNotReject(run())
  assert.equal(expiries, 2)
})
