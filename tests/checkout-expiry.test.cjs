const assert = require('node:assert/strict')
const test = require('node:test')
test.beforeEach((t) => {
  require('./helpers/test-env.cjs').configureTestEnvironment()
  t.mock.method(
    require('../server/dist/services/paymentEnvironment.js'),
    'assertPaymentEnvironment',
    async () => {}
  )
})

require('./helpers/test-env.cjs').configureTestEnvironment()
process.env.CACHE_ENABLED = 'true'

const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const {
  expireAbandonedCheckouts,
  inspectCheckoutProviderState,
} = require('../server/dist/modules/checkout/service.js')
const { getCache, setCache, flushCache } = require('../server/dist/config/cache.js')

const productKey = 'GET:/api/products?expiry-regression=1'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function expiryTransport(t, outcomes, { readFailure } = {}) {
  const attempts = [],
    signals = [],
    delays = [],
    reads = []
  const originalTimeout = global.setTimeout
  t.mock.method(AbortSignal, 'timeout', (duration) => {
    assert.equal(duration, 5000)
    const signal = new AbortController().signal
    signals.push(signal)
    return signal
  })
  t.mock.method(global, 'setTimeout', (callback, duration, ...args) => {
    if (duration === 250 || duration === 500) {
      delays.push(duration)
      return originalTimeout(callback, 0, ...args)
    }
    return originalTimeout(callback, duration, ...args)
  })
  t.mock.method(global, 'fetch', async (input, init) => {
    const url = new URL(input)
    if (url.pathname.endsWith('/rpc/expire_abandoned_checkouts')) {
      attempts.push({ args: JSON.parse(init.body), signal: init.signal })
      const outcome = outcomes[Math.min(attempts.length - 1, outcomes.length - 1)]
      if (outcome instanceof Error) throw outcome
      return outcome()
    }
    assert.ok(url.pathname.endsWith('/orders'), url.pathname)
    reads.push(url)
    if (readFailure) throw readFailure
    return json([])
  })
  flushCache()
  setCache(productKey, { stock: 0 })
  t.after(flushCache)
  return { attempts, signals, delays, reads }
}

for (const [name, failure] of [
  [
    'returned fetch failure',
    () => {
      throw new TypeError('fetch failed', {
        cause: Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }),
      })
    },
  ],
  [
    'returned abort failure',
    () => {
      throw new DOMException('The operation was aborted', 'AbortError')
    },
  ],
  [
    'returned timeout failure',
    () => {
      throw new DOMException('The operation timed out', 'TimeoutError')
    },
  ],
  ['gateway failure', () => json({ message: 'upstream unavailable' }, 503)],
  [
    'gateway failure with a proxy error code',
    () => json({ code: 'SERVICE_UNAVAILABLE', message: 'upstream unavailable' }, 503),
  ],
]) {
  test(`expiry retries a ${name} and invalidates cache despite a later zero`, async (t) => {
    const state = expiryTransport(t, [failure, () => json(0)])
    assert.deepEqual(await expireAbandonedCheckouts(5000), { released: 0, retained: 0 })
    assert.equal(state.attempts.length, 2)
    assert.deepEqual(
      state.attempts.map((attempt) => attempt.args),
      [{ p_limit: 1000 }, { p_limit: 1000 }]
    )
    assert.deepEqual(state.delays, [250])
    assert.equal(state.signals.length, 2)
    assert.notEqual(state.signals[0], state.signals[1])
    assert.deepEqual(
      state.attempts.map((attempt) => attempt.signal),
      state.signals
    )
    assert.equal(getCache(productKey), null)
  })
}

test('expiry exhausts exactly three attempts and invalidates potentially committed releases', async (t) => {
  const state = expiryTransport(t, [
    () => {
      throw new TypeError('fetch failed')
    },
  ])
  await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
  assert.equal(state.attempts.length, 3)
  assert.deepEqual(state.delays, [250, 500])
  assert.equal(state.signals.length, 3)
  assert.equal(new Set(state.signals).size, 3)
  assert.equal(state.reads.length, 0)
  assert.equal(getCache(productKey), null)
})

test('expiry catches thrown transport failures as well as returned Supabase errors', async (t) => {
  const state = expiryTransport(t, [() => json(2)])
  let calls = 0
  const originalRpc = adminSupabase.rpc
  t.mock.method(adminSupabase, 'rpc', function (name, args) {
    calls += 1
    if (calls < 3)
      return {
        abortSignal: async () => {
          throw Object.assign(new Error('socket closed'), { code: 'ECONNRESET' })
        },
      }
    return originalRpc.call(this, name, args)
  })
  assert.deepEqual(await expireAbandonedCheckouts(), { released: 2, retained: 0 })
  assert.equal(calls, 3)
  assert.deepEqual(state.delays, [250, 500])
  assert.equal(getCache(productKey), null)
})

for (const [name, failure] of [
  ['socket hang up', new Error('socket hang up')],
  ['broken pipe', Object.assign(new Error('broken pipe'), { code: 'EPIPE' })],
  ['other side closed', new Error('other side closed')],
  [
    'nested aggregate connection failures',
    new Error('request failed', {
      cause: new AggregateError([
        Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }),
        Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
      ]),
    }),
  ],
]) {
  test(`expiry retries thrown ${name}`, async (t) => {
    const state = expiryTransport(t, [() => json(0)])
    const originalRpc = adminSupabase.rpc
    let calls = 0
    t.mock.method(adminSupabase, 'rpc', function (name, args) {
      calls += 1
      if (calls === 1)
        return {
          abortSignal: async () => {
            throw failure
          },
        }
      return originalRpc.call(this, name, args)
    })
    assert.deepEqual(await expireAbandonedCheckouts(), { released: 0, retained: 0 })
    assert.equal(calls, 2)
    assert.deepEqual(state.delays, [250])
    assert.equal(getCache(productKey), null)
  })
}

for (const [name, outcome] of [
  ['SQL failure', () => json({ code: '23514', message: 'constraint violation' }, 400)],
  ['permission failure', () => json({ code: '42501', message: 'permission denied' }, 403)],
  ['missing function', () => json({ code: 'PGRST202', message: 'function missing' }, 404)],
  [
    'SQL error behind a gateway status',
    () => json({ code: '42501', message: 'fetch failed' }, 503),
  ],
]) {
  test(`expiry does not retry a ${name}`, async (t) => {
    const state = expiryTransport(t, [outcome])
    await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
    assert.equal(state.attempts.length, 1)
    assert.deepEqual(state.delays, [])
    assert.deepEqual(getCache(productKey), { stock: 0 })
  })
}

for (const invalidCount of [null, '2', -1, 1.5, {}]) {
  test(`expiry rejects malformed success ${JSON.stringify(invalidCount)} without retrying or inventing a count`, async (t) => {
    const state = expiryTransport(t, [() => json(invalidCount)])
    await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
    assert.equal(state.attempts.length, 1)
    assert.equal(state.reads.length, 0)
    assert.deepEqual(state.delays, [])
    assert.equal(getCache(productKey), null)
  })
}

test('confirmed releases invalidate cache even when the later checkout read fails', async (t) => {
  const state = expiryTransport(t, [() => json(3)], { readFailure: new TypeError('fetch failed') })
  await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
  assert.equal(state.attempts.length, 1)
  assert.equal(getCache(productKey), null)
})

test('an ambiguous attempt still invalidates cache when a later checkout read fails', async (t) => {
  const state = expiryTransport(
    t,
    [
      () => {
        throw new TypeError('fetch failed')
      },
      () => json(0),
    ],
    { readFailure: new DOMException('Aborted', 'AbortError') }
  )
  await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
  assert.equal(state.attempts.length, 2)
  assert.equal(getCache(productKey), null)
})

test('expiry does not retry an unparseable successful response', async (t) => {
  const state = expiryTransport(t, [
    () =>
      new Response('{invalid json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  ])
  await assert.rejects(expireAbandonedCheckouts(), { code: 'DB_ERROR' })
  assert.equal(state.attempts.length, 1)
  assert.deepEqual(state.delays, [])
  assert.equal(getCache(productKey), null)
})

test('zero confirmed releases preserve cache when no transport outcome was ambiguous', async (t) => {
  const state = expiryTransport(t, [() => json(0)])
  assert.deepEqual(await expireAbandonedCheckouts(0), { released: 0, retained: 0 })
  assert.deepEqual(state.attempts[0].args, { p_limit: 1 })
  assert.equal(state.signals.length, 1)
  assert.deepEqual(getCache(productKey), { stock: 0 })
})

const attachedCheckout = {
  id: 'checkout-with-provider',
  payments: [{ razorpay_order_id: 'order-provider', amount_paisa: 15000, currency: 'INR' }],
}
const attachedLease = {
  scope: 'checkout_payment',
  resourceId: attachedCheckout.id,
  ownerToken: '00000000-0000-4000-8000-000000000001',
  fencingToken: 1,
}

for (const [classification, mutation] of [
  ['terminal_unpaid', 'fail_checkout_fenced'],
  ['payable', 'release_retained_checkout_fenced'],
]) {
  const inspection = {
    classification,
    providerStatus: classification === 'terminal_unpaid' ? 'closed' : 'created',
    amountPaidPaisa: 0,
    currency: 'INR',
  }
  for (const failureMode of ['returned', 'thrown']) {
    test(`${classification} release invalidates product cache after a ${failureMode} lost response without retrying`, async (t) => {
      flushCache()
      t.after(flushCache)
      setCache(productKey, { stock: 0 })
      let releaseDispatches = 0
      let reservationStatus = 'reserved'
      const dispatchRelease = () => {
        releaseDispatches += 1
        reservationStatus = 'released'
        throw new TypeError('fetch failed')
      }
      t.mock.method(global, 'fetch', async (input) => {
        const operation = new URL(input).pathname.split('/').at(-1)
        if (operation === 'retain_payable_checkout_fenced') return json(false)
        assert.equal(operation, mutation)
        return dispatchRelease()
      })
      if (failureMode === 'thrown') {
        const originalRpc = adminSupabase.rpc
        t.mock.method(adminSupabase, 'rpc', function (name, args) {
          if (name === mutation) return Promise.resolve().then(dispatchRelease)
          return originalRpc.call(this, name, args)
        })
      }
      await assert.rejects(
        inspectCheckoutProviderState(attachedCheckout, attachedLease, { inspection })
      )
      assert.equal(reservationStatus, 'released')
      assert.equal(releaseDispatches, 1)
      assert.equal(getCache(productKey), null)
    })
  }

  test(`expiry does not invent a released count after a lost ${classification} release response`, async (t) => {
    flushCache()
    t.after(flushCache)
    setCache(productKey, { stock: 0 })
    const retained = require('../server/dist/services/retainedCheckout.js')
    t.mock.method(retained, 'inspectRetainedCheckoutProvider', async () => inspection)
    let releaseDispatches = 0
    t.mock.method(global, 'fetch', async (input) => {
      const operation = new URL(input).pathname.split('/').at(-1)
      if (operation === 'expire_abandoned_checkouts') return json(0)
      if (operation === 'orders') return json([attachedCheckout])
      if (operation === 'claim_operation_lease') {
        return json([
          {
            scope: attachedLease.scope,
            resource_id: attachedLease.resourceId,
            owner_token: attachedLease.ownerToken,
            fencing_token: attachedLease.fencingToken,
          },
        ])
      }
      if (operation === 'release_operation_lease') return json(true)
      if (operation === 'retain_payable_checkout_fenced') return json(false)
      assert.equal(operation, mutation)
      releaseDispatches += 1
      throw new TypeError('fetch failed')
    })
    assert.deepEqual(await expireAbandonedCheckouts(), { released: 0, retained: 0 })
    assert.equal(releaseDispatches, 1)
    assert.equal(getCache(productKey), null)
  })
}
