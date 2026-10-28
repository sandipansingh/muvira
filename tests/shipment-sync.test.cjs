const test = require('node:test')
const assert = require('node:assert/strict')
require('./helpers/test-env.cjs').configureTestEnvironment()
const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const provider = require('../server/dist/services/shiprocket.js')
const observations = require('../server/dist/modules/shiprocket/service.js')
const { synchronizeActiveShipments } = require('../server/dist/services/shipmentSync.js')
test('polling keyset pagination visits more than500 active shipments in provider batches of50', async (t) => {
  const originalFrom = adminSupabase.from,
    originalBulk = provider.trackBulk,
    originalProcess = observations.processTrackingResult
  t.after(() => {
    adminSupabase.from = originalFrom
    provider.trackBulk = originalBulk
    observations.processTrackingResult = originalProcess
  })
  const rows = Array.from({ length: 1101 }, (_, i) => ({
    id: String(i).padStart(5, '0'),
    awb_code: `SYNTHETIC-${i}`,
  }))
  const visited = [],
    batches = []
  adminSupabase.from = () => {
    let cursor = ''
    const q = {
      select: () => q,
      not: () => q,
      in: () => q,
      order: () => q,
      gt: (_key, value) => {
        cursor = value
        return q
      },
      limit: () => q,
      then: (resolve) =>
        resolve({ data: rows.filter((row) => row.id > cursor).slice(0, 500), error: null }),
    }
    return q
  }
  provider.trackBulk = async (awbs) => {
    batches.push(awbs.length)
    return Object.fromEntries(awbs.map((awb) => [awb, { tracking_data: {} }]))
  }
  observations.processTrackingResult = async (awb) => {
    visited.push(awb)
    return { status: 'processed', applied: true }
  }
  const result = await synchronizeActiveShipments()
  assert.equal(result.totalChecked, 1101)
  assert.equal(result.totalUpdated, 1101)
  assert.equal(new Set(visited).size, 1101)
  assert.ok(batches.every((size) => size <= 50))
  adminSupabase.from = () => {
    const q = {
      select: () => q,
      not: () => q,
      in: () => q,
      order: () => q,
      limit: () => q,
      then: (resolve) =>
        resolve({ data: null, error: { code: '08006', message: 'synthetic outage' } }),
    }
    return q
  }
  await assert.rejects(synchronizeActiveShipments(), /Active shipments could not be loaded/)
})
