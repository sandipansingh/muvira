const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  LOG_LEVEL: 'fatal',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-value',
  RAZORPAY_KEY_ID: 'rzp_test_example',
  RAZORPAY_KEY_SECRET: 'payment-signature-secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook-signature-secret',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  EMAIL_FROM: 'orders@example.com',
  SHIPROCKET_EMAIL: 'shipping@example.com',
  SHIPROCKET_PASSWORD: 'test-password',
  SHIPROCKET_WEBHOOK_ENABLED: 'false',
})

const { verifyWebhookSignature } = require('../server/dist/lib/razorpay/verifySignature.js')
const { parseRazorpayWebhookPayment } = require('../server/dist/modules/payments/service.js')
const { parseShiprocketWebhookPayload } = require('../server/dist/modules/shiprocket/service.js')
const { shiprocketStatusToOrderStatus } = require('../server/dist/modules/orders/stateMachine.js')

const fixtureDirectory = join(__dirname, 'fixtures')

function loadFixture(name) {
  const rawBody = readFileSync(join(fixtureDirectory, name))
  return { rawBody, payload: JSON.parse(rawBody.toString('utf8')) }
}

test('Razorpay captured and failed fixtures match the verified payment contract', () => {
  for (const fixtureName of ['razorpay-payment-captured.json', 'razorpay-payment-failed.json']) {
    const { rawBody, payload } = loadFixture(fixtureName)
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    assert.equal(verifyWebhookSignature({ rawBody, signature }), true)
    assert.ok(parseRazorpayWebhookPayment(payload))
  }
})

test('Razorpay fixture parsing rejects malformed payment entities', () => {
  const { payload } = loadFixture('razorpay-payment-captured.json')
  payload.payload.payment.entity.amount = '12.50'

  assert.equal(parseRazorpayWebhookPayment(payload), undefined)
})

test('Shiprocket fixtures preserve vendor identifiers, timestamps, and scans', () => {
  const { payload } = loadFixture('shiprocket-in-transit.json')
  const first = parseShiprocketWebhookPayload(payload)
  const second = parseShiprocketWebhookPayload(payload)

  assert.equal(first.awbCode, 'AWB-TEST-1001')
  assert.equal(first.shiprocketOrderId, '810001')
  assert.equal(first.merchantOrderId, 'MUV-TEST-1001')
  assert.equal(first.eventTime, '2026-09-15T05:00:00.000Z')
  assert.equal(first.location, 'Kolkata')
  assert.equal(first.remarks, 'Shipment departed the origin hub')
  assert.equal(first.vendorEventId, second.vendorEventId)
})

test('Shiprocket RTO and unknown statuses retain their distinct semantics', () => {
  const rto = parseShiprocketWebhookPayload(loadFixture('shiprocket-rto-delivered.json').payload)
  const unknown = parseShiprocketWebhookPayload(
    loadFixture('shiprocket-unknown-status.json').payload
  )

  assert.equal(shiprocketStatusToOrderStatus(rto.currentStatus), 'returned')
  assert.equal(shiprocketStatusToOrderStatus(unknown.currentStatus), null)
})

test('Shiprocket parser rejects payloads without a current status', () => {
  const { payload } = loadFixture('shiprocket-malformed.json')

  assert.throws(
    () => parseShiprocketWebhookPayload(payload),
    /Shiprocket webhook is missing current_status/
  )
})
