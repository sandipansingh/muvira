const assert = require('node:assert/strict')
const test = require('node:test')

const {
  databaseError,
  isPostgrestNoRows,
  sanitizePostgrestError,
} = require('../server/dist/lib/databaseError.js')

test('database errors retain only structured PostgREST diagnostics internally', () => {
  const rawError = {
    code: 'PGRST202',
    message: 'Function was not found in the schema cache',
    details: 'Searched for public.example()',
    hint: 'Reload the schema cache',
    access_token: 'must-not-be-copied',
  }

  assert.deepEqual(sanitizePostgrestError(rawError), {
    code: rawError.code,
    message: rawError.message,
    details: rawError.details,
    hint: rawError.hint,
  })

  const error = databaseError('products.list', rawError, 'Failed to fetch products')
  assert.equal(error.statusCode, 500)
  assert.equal(error.code, 'DB_ERROR')
  assert.equal(error.message, 'Failed to fetch products')
  assert.equal(error.context.operation, 'products.list')
  assert.deepEqual(error.context.postgrest, sanitizePostgrestError(rawError))
  assert.equal('access_token' in error.context.postgrest, false)
  assert.equal(isPostgrestNoRows({ code: 'PGRST116' }), true)
  assert.equal(isPostgrestNoRows(rawError), false)
})
