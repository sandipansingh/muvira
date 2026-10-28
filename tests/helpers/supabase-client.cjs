const {
  createClient: createSupabaseClient,
} = require('../../server/node_modules/@supabase/supabase-js')
const WebSocket = require('../../server/node_modules/ws')

function createClient(url, key, options = {}) {
  return createSupabaseClient(url, key, {
    ...options,
    realtime: { ...options.realtime, transport: WebSocket },
  })
}

module.exports = { createClient }
