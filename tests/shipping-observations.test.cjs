const test = require('node:test')
const assert = require('node:assert/strict')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { parseShiprocketWebhookPayload } = require('../server/dist/modules/shiprocket/service.js')
const {
  isValidProviderTransition,
  isValidTransition,
} = require('../server/dist/modules/orders/stateMachine.js')
const { isCancelledStatus } = require('../server/dist/services/providerOperations.js')
test('provider observations converge across missed milestones without weakening manual transitions', () => {
  assert.equal(isValidProviderTransition('processing', 'delivered'), true)
  assert.equal(isValidProviderTransition('processing', 'returned'), true)
  assert.equal(isValidProviderTransition('delivery_failed', 'shipped'), true)
  assert.equal(isValidProviderTransition('rto', 'out_for_delivery'), false)
  for (const from of [
    'cancelled',
    'refunded',
    'delivered',
    'returned',
    'lost',
    'damaged',
    'pending',
  ])
    assert.equal(isValidProviderTransition(from, 'shipped'), false)
  assert.equal(isValidTransition('processing', 'delivered'), false)
})
test('missing and invalid vendor times stay unknown with deterministic event identity', () => {
  for (const time of [undefined, 'invalid', '31 02 2026 12:00:00', '2026-02-31T12:00:00Z', '123']) {
    const payload = { awb: 'synthetic', current_status: 'IN TRANSIT', current_timestamp: time }
    assert.equal(parseShiprocketWebhookPayload(payload).eventTime, null)
    assert.equal(
      parseShiprocketWebhookPayload(payload).vendorEventId,
      parseShiprocketWebhookPayload(payload).vendorEventId
    )
  }
})
test('cancellation proof excludes requested, failed, pending, and numeric status namespaces', () => {
  for (const status of [
    'Cancellation Requested',
    'Cancel pending',
    'Cancellation failed',
    'Not cancelled',
    '5',
    5,
    6,
  ])
    assert.equal(isCancelledStatus(status), false)
  for (const status of ['CANCELED', 'cancelled', 'CANCELLED BEFORE SHIPPING'])
    assert.equal(isCancelledStatus(status), true)
})
