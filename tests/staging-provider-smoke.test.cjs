const assert = require('node:assert/strict')
const test = require('node:test')

const enabled = process.env.RUN_STAGING_PROVIDER_SMOKE === 'true'
const requestTimeoutMs = 10_000

function requiredEnvironment(name) {
  const value = process.env[name]?.trim()
  assert.ok(value, `${name} is required for the staging provider smoke test`)
  return value
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
}

test('staging API reports ready', { skip: !enabled }, async () => {
  const apiUrl = new URL(requiredEnvironment('STAGING_API_URL'))
  assert.equal(apiUrl.protocol, 'https:')

  const response = await fetchWithTimeout(new URL('/api/health/ready', apiUrl))
  assert.equal(response.status, 200, 'The staging API did not report ready')
})

test('Razorpay test-mode credentials authenticate', { skip: !enabled }, async () => {
  const keyId = requiredEnvironment('RAZORPAY_KEY_ID')
  const keySecret = requiredEnvironment('RAZORPAY_KEY_SECRET')
  assert.match(keyId, /^rzp_test_/, 'Staging must use a Razorpay test-mode key')

  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const response = await fetchWithTimeout('https://api.razorpay.com/v1/orders?count=1', {
    headers: { Authorization: `Basic ${authorization}` },
  })

  assert.equal(response.status, 200, 'Razorpay test-mode credentials were rejected')
})

test(
  'Shiprocket credentials authenticate without creating a shipment',
  { skip: !enabled },
  async () => {
    const response = await fetchWithTimeout('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: requiredEnvironment('SHIPROCKET_EMAIL'),
        password: requiredEnvironment('SHIPROCKET_PASSWORD'),
      }),
    })

    assert.equal(response.status, 200, 'Shiprocket credentials were rejected')
    const body = await response.json()
    assert.equal(typeof body.token, 'string')
    assert.ok(body.token.length > 0, 'Shiprocket did not return an authentication token')
  }
)
