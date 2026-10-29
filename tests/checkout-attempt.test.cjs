const assert = require('node:assert/strict')
const test = require('node:test')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const sessions = require('../server/dist/modules/checkout/session.js')
const controller = require('../server/dist/modules/checkout/controller.js')

test('attempt initialization establishes cart ownership without calling a payment provider', async (t) => {
  assert.equal(typeof controller.initializeAttempt, 'function')
  const calls = []
  t.mock.method(adminSupabase, 'rpc', async (name, args) => {
    calls.push([name, args])
    return { data: { attempt_id: 'request' }, error: null }
  })
  let body
  await controller.initializeAttempt(
    { user: { id: 'customer' }, body: { checkout_request_id: 'request' } },
    {
      setHeader() {},
      json(value) {
        body = value
      },
    },
    (err) => {
      throw err
    }
  )
  assert.deepEqual(calls, [
    ['begin_checkout_attempt', { p_user_id: 'customer', p_request_id: 'request' }],
  ])
  assert.equal(body.data.attempt_id, 'request')
})

test('request recovery filters by account and request and returns no preparation', async (t) => {
  assert.equal(typeof sessions.getCheckoutPaymentByRequest, 'function')
  const filters = []
  const query = {
    select() {
      return query
    },
    eq(key, value) {
      filters.push([key, value])
      return query
    },
    async maybeSingle() {
      return { data: null, error: null }
    },
  }
  t.mock.method(adminSupabase, 'from', (table) => {
    assert.equal(table, 'checkout_preparations')
    return query
  })
  assert.equal(await sessions.getCheckoutPaymentByRequest('customer', 'request'), null)
  assert.deepEqual(filters, [
    ['user_id', 'customer'],
    ['request_id', 'request'],
  ])
})

test('quote requests have a user budget independent of payment mutations', async (t) => {
  const express = require('../server/node_modules/express')
  const { once } = require('node:events')
  const {
    checkoutQuoteLimiter,
    checkoutLimiter,
  } = require('../server/dist/middleware/rateLimit.js')
  const app = express()
  app.use((req, _res, next) => {
    req.user = { id: req.get('X-User') || 'limit-customer' }
    next()
  })
  app.post('/quote', checkoutQuoteLimiter, (_req, res) => res.json({ ok: true }))
  app.post('/pay', checkoutLimiter, (_req, res) => res.json({ ok: true }))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`
  for (let i = 0; i < 120; i++)
    assert.equal((await fetch(origin + '/quote', { method: 'POST' })).status, 200)
  assert.equal((await fetch(origin + '/quote', { method: 'POST' })).status, 429)
  assert.equal(
    (await fetch(origin + '/quote', { method: 'POST', headers: { 'X-User': 'another-customer' } }))
      .status,
    200
  )
  for (let i = 0; i < 20; i++)
    assert.equal((await fetch(origin + '/pay', { method: 'POST' })).status, 200)
  assert.equal((await fetch(origin + '/pay', { method: 'POST' })).status, 429)
})

test('quote traffic does not consume the general API budget used by payments', async (t) => {
  const express = require('../server/node_modules/express')
  const { once } = require('node:events')
  const { catalogApiLimiter } = require('../server/dist/middleware/rateLimit.js')
  const app = express()
  app.use('/api', catalogApiLimiter)
  app.post('/api/checkout/quote', (_req, res) => res.json({ ok: true }))
  app.post('/api/checkout/create-order', (_req, res) => res.json({ ok: true }))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const origin = `http://127.0.0.1:${server.address().port}`
  for (let i = 0; i < 301; i++) await fetch(origin + '/api/checkout/quote', { method: 'POST' })
  assert.equal((await fetch(origin + '/api/checkout/create-order', { method: 'POST' })).status, 200)
})
