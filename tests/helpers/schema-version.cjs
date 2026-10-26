const { readdirSync } = require('node:fs')
const { join } = require('node:path')

const latestSchemaVersion = Math.max(
  ...readdirSync(join(__dirname, '../../supabase/migrations'))
    .filter((name) => /^\d{3}_.*\.sql$/.test(name))
    .map((name) => Number(name.slice(0, 3)))
)
module.exports = { latestSchemaVersion }
