function assertLocalTestDb(env = process.env) {
  const names = ['SUPABASE_TEST_URL', 'SUPABASE_TEST_ANON_KEY', 'SUPABASE_TEST_SERVICE_ROLE_KEY']
  if (!names.some((name) => Boolean(env[name]))) return
  let url
  try {
    url = new URL(env.SUPABASE_TEST_URL)
  } catch {
    /* Reject malformed targets below. */
  }
  if (
    env.SUPABASE_TEST_ISOLATED_LOCAL !== 'true' ||
    !url ||
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Database fixtures require isolated local Supabase and SUPABASE_TEST_ISOLATED_LOCAL=true; hosted targets are forbidden.'
    )
}
module.exports = { assertLocalTestDb }
