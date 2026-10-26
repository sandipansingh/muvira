const assert = require('node:assert/strict')
const test = require('node:test')
test('database fixture guard permits absent config but rejects any unsafe configured target', () => {
  const { assertLocalTestDb } = require('./helpers/assert-local-test-db.cjs')
  assert.doesNotThrow(() => assertLocalTestDb({}))
  for (const env of [
    { SUPABASE_TEST_URL: 'https://hosted.supabase.co' },
    { SUPABASE_TEST_URL: 'http://127.0.0.1:54321' },
    { SUPABASE_TEST_SERVICE_ROLE_KEY: 'secret' },
    { SUPABASE_TEST_URL: 'http://localhost.evil.test:54321', SUPABASE_TEST_ISOLATED_LOCAL: 'true' },
  ])
    assert.throws(() => assertLocalTestDb(env), /isolated local Supabase/)
  assert.doesNotThrow(() =>
    assertLocalTestDb({
      SUPABASE_TEST_URL: 'http://127.0.0.1:54321',
      SUPABASE_TEST_ISOLATED_LOCAL: 'true',
    })
  )
})
