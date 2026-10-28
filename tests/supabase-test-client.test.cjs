const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const test = require('node:test')
const { createClient } = require('./helpers/supabase-client.cjs')

test('database fixture clients initialize without native WebSocket support on supported Node versions', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `delete globalThis.WebSocket
       const { serviceClient } = require('./tests/helpers/provider-db-fixture.cjs')
       const client = serviceClient('http://127.0.0.1:54321', 'test-fixture-key')
       if (typeof client.rpc !== 'function') throw new Error('Database client did not initialize')`,
    ],
    { cwd: resolve(__dirname, '..'), encoding: 'utf8' }
  )
  assert.equal(result.status, 0, result.stderr || result.error?.message)
})

test('test client transport preserves custom fetch, headers and realtime configuration', async () => {
  let request
  const client = createClient('http://127.0.0.1:54321', 'test-fixture-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { heartbeatIntervalMs: 34567 },
    global: {
      headers: { 'X-Fixture': 'preserved' },
      fetch: async (url, options) => {
        request = { url: String(url), headers: new Headers(options.headers) }
        return new Response(JSON.stringify({ fixture: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  })
  const result = await client.rpc('fixture_transport')
  assert.ifError(result.error)
  assert.deepEqual(result.data, { fixture: true })
  assert.equal(request.url, 'http://127.0.0.1:54321/rest/v1/rpc/fixture_transport')
  assert.equal(request.headers.get('X-Fixture'), 'preserved')
  assert.equal(client.realtime.heartbeatIntervalMs, 34567)
})
