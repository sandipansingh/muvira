const { test } = require('node:test')
const assert = require('node:assert/strict')
require('./helpers/test-env.cjs').configureTestEnvironment()
process.env.SEO_INTERNAL_TOKEN = 'a'.repeat(32)
test('only token-verified allowlisted catalog GETs get an isolated process quota', async () => {
  const express = require('../server/node_modules/express')
  const { catalogApiLimiter } = require('../server/dist/middleware/rateLimit.js')
  const app = express()
  app.set('trust proxy', 1)
  app.use('/api', catalogApiLimiter)
  app.use((req, res) => res.json({ ok: true }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    for (const [path, method, token, expected] of [
      ['/products', 'GET', process.env.SEO_INTERNAL_TOKEN, '3000'],
      ['/categories/god-idols', 'GET', process.env.SEO_INTERNAL_TOKEN, '3000'],
      ['/products', 'GET', 'wrong', '300'],
      ['/products', 'POST', process.env.SEO_INTERNAL_TOKEN, '300'],
      ['/admin/products', 'GET', process.env.SEO_INTERNAL_TOKEN, '300'],
      ['/products/id/reviews', 'GET', process.env.SEO_INTERNAL_TOKEN, '300'],
      ['/products/x/related', 'GET', process.env.SEO_INTERNAL_TOKEN, '300'],
      ['/products', 'HEAD', process.env.SEO_INTERNAL_TOKEN, '300'],
    ]) {
      const res = await fetch(origin + '/api' + path, {
        method,
        headers: { 'X-Muvira-SEO-Token': token },
      })
      assert.equal(res.headers.get('ratelimit-limit'), expected, `${method} ${path}`)
    }
    const acrossReplica = await fetch(origin + '/api/products', {
      headers: {
        'X-Muvira-SEO-Token': process.env.SEO_INTERNAL_TOKEN,
        'X-Forwarded-For': '192.0.2.20',
      },
    })
    assert.equal(acrossReplica.headers.get('ratelimit-remaining'), '2997')
    for (let batch = 0; batch < 60; batch++) {
      await Promise.all(
        Array.from({ length: 50 }, async () => {
          const res = await fetch(origin + '/api/products', {
            headers: { 'X-Muvira-SEO-Token': process.env.SEO_INTERNAL_TOKEN },
          })
          await res.arrayBuffer()
        })
      )
    }
    const exhausted = await fetch(origin + '/api/products', {
      headers: { 'X-Muvira-SEO-Token': process.env.SEO_INTERNAL_TOKEN },
    })
    assert.equal(exhausted.status, 429)
    assert.ok(exhausted.headers.get('retry-after'))
    assert.equal((await fetch(origin + '/api/products')).status, 200)
  } finally {
    await new Promise((r) => server.close(r))
  }
})

test('structured logging redacts the SEO credential', () => {
  const { spawnSync } = require('node:child_process')
  const output = spawnSync(
    process.execPath,
    [
      '-e',
      `require('./tests/helpers/test-env.cjs').configureTestEnvironment();process.env.NODE_ENV='production';process.env.RESEND_API_KEY='fixture-resend-key';process.env.SHIPROCKET_WEBHOOK_ENABLED='true';process.env.SHIPROCKET_WEBHOOK_SECRET='fixture-secret-long-enough';const{logger}=require('./server/dist/lib/logger.js');logger.fatal({req:{headers:{'x-muvira-seo-token':'do-not-expose-this-token'}}},'fixture')`,
    ],
    { encoding: 'utf8' }
  )
  assert.equal(output.status, 0)
  assert.doesNotMatch(output.stdout, /do-not-expose-this-token/)
  assert.match(output.stdout, /REDACTED/)
})
test('category lookup propagates upstream errors rather than pretending a collection is empty', async () => {
  const modulePath = require.resolve('../server/dist/lib/supabase/admin.js')
  const dbError = { code: '08006', message: 'connection failed' }
  const chain = new Proxy(
    {},
    {
      get: (_target, property) =>
        property === 'single'
          ? async () => ({ data: null, error: dbError })
          : property === 'then'
            ? (resolve) => resolve({ data: [], count: 0, error: null })
            : () => chain,
    }
  )
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: { adminSupabase: { from: () => chain } },
  }
  const { listProducts } = require('../server/dist/modules/products/service.js')
  await assert.rejects(
    () => listProducts({ page: 1, limit: 12, category: 'idols', sort: 'newest' }),
    (error) => error.code === 'DB_ERROR'
  )
})
