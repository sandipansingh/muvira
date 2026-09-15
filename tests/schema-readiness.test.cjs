const assert = require('node:assert/strict')
const { once } = require('node:events')
const test = require('node:test')

const supabaseUrl = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const expectedValue = process.env.EXPECTED_SCHEMA_READY
const shouldRun = Boolean(supabaseUrl && anonKey && serviceRoleKey && expectedValue)

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  LOG_LEVEL: 'fatal',
  SUPABASE_URL: supabaseUrl ?? 'https://example.supabase.co',
  SUPABASE_ANON_KEY: anonKey ?? 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ?? 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_readiness',
  RAZORPAY_KEY_SECRET: 'readiness-payment-secret',
  RAZORPAY_WEBHOOK_SECRET: 'readiness-webhook-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  CACHE_ENABLED: 'false',
  CACHE_DEBUG: 'false',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

const { createApp } = require('../server/dist/app.js')
const { getRuntimeSchemaStatus } = require('../server/dist/services/runtimeSchema.js')
const { startWorkersWhenSchemaReady } = require('../server/dist/services/workerStartup.js')

test(
  'schema compatibility controls readiness, database traffic, and workers',
  { skip: !shouldRun },
  async () => {
    const expectedReady = expectedValue === 'true'
    const status = await getRuntimeSchemaStatus({ forceRefresh: true })
    assert.equal(status.ready, expectedReady)

    let workerStarts = 0
    const workersStarted = await startWorkersWhenSchemaReady(() => {
      workerStarts += 1
    })
    assert.equal(workersStarted, expectedReady)
    assert.equal(workerStarts, expectedReady ? 1 : 0)

    if (expectedReady) {
      assert.equal(status.contract.contract_version, 38)
      assert.equal(status.contract.migration_version, '038')
      for (const [key, value] of Object.entries(status.contract)) {
        if (key.startsWith('missing_') || key.startsWith('invalid_')) assert.deepEqual(value, [])
      }
    }

    const server = createApp().listen(0)
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const baseUrl = `http://127.0.0.1:${address.port}`

    try {
      const liveResponse = await fetch(`${baseUrl}/api/health`)
      assert.equal(liveResponse.status, 200)

      const readyResponse = await fetch(`${baseUrl}/api/health/ready`)
      assert.equal(readyResponse.status, expectedReady ? 200 : 503)
      const readyBody = await readyResponse.json()
      assert.equal(readyBody.data.services.database_contract, expectedReady ? 'ok' : 'error')

      const productResponse = await fetch(`${baseUrl}/api/products`)
      assert.equal(productResponse.status, expectedReady ? 200 : 503)
      if (!expectedReady) {
        const productBody = await productResponse.json()
        assert.equal(productBody.error.code, 'SCHEMA_NOT_READY')
      }
    } finally {
      server.close()
      await once(server, 'close')
    }
  }
)
