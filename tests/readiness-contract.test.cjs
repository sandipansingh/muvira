const assert = require('node:assert/strict')
const { once } = require('node:events')
const test = require('node:test')

require('./helpers/test-env.cjs').configureTestEnvironment()
process.env.SCHEMA_RELEASE_MODE = 'final'

const { adminSupabase } = require('../server/dist/lib/supabase/admin.js')
const { createApp } = require('../server/dist/app.js')
const { clearRuntimeSchemaStatusCache } = require('../server/dist/services/runtimeSchema.js')
const workers = require('../server/dist/services/workerStartup.js')

function contract(version, ready) {
  return {
    contract_version: version,
    migration_version: String(version).padStart(3, '0'),
    ready,
    missing_relations: [],
    missing_columns: [],
    missing_functions: [],
    invalid_relation_grants: [],
    invalid_function_grants: [],
    missing_constraints: [],
    invalid_rls_relations: [],
    missing_indexes: [],
    invalid_storage_capabilities: [],
  }
}

for (const [version, databaseReady, expectedReady] of [
  [56, true, false],
  [57, true, false],
  [58, true, true],
  [55, true, false],
  [57, false, false],
]) {
  test(`readiness advertises supported contracts while version ${version} is ${expectedReady ? 'ready' : 'blocked'} (database ready=${databaseReady})`, async (t) => {
    clearRuntimeSchemaStatusCache()
    t.after(clearRuntimeSchemaStatusCache)
    t.mock.method(adminSupabase, 'rpc', async (name) => {
      assert.equal(name, 'get_runtime_schema_status')
      return { data: contract(version, databaseReady), error: null }
    })
    t.mock.method(workers, 'getWorkerStartupStatus', () => 'running')
    const server = createApp().listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const origin = `http://127.0.0.1:${server.address().port}`
    for (const route of ['/api/health/ready', '/api/health/full']) {
      const response = await fetch(`${origin}${route}`)
      assert.equal(response.status, expectedReady ? 200 : 503)
      const body = await response.json()
      assert.equal(body.success, expectedReady)
      assert.deepEqual(body.data.database_contract, {
        status: expectedReady ? 'compatible' : 'incompatible',
        expected_version: 58,
        supported_versions: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
        reported_version: version,
      })
    }
  })
}
