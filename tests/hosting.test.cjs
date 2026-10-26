const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const test = require('node:test')

test('static server resolves dist from script and returns asset 404s', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'muvira-hosting-'))
  const { readFile } = require('node:fs/promises')
  await mkdir(path.join(root, 'scripts'))
  await mkdir(path.join(root, 'dist'))
  await writeFile(
    path.join(root, 'scripts/serve-static.mjs'),
    await readFile(path.resolve('client/scripts/serve-static.mjs'))
  )
  await writeFile(path.join(root, 'dist/index.html'), '<h1>SPA fixture</h1>')
  const child = spawn(process.execPath, [path.join(root, 'scripts/serve-static.mjs')], {
    cwd: tmpdir(),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    const address = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Server did not report listening address')),
        2000
      )
      child.stdout.on('data', (data) => {
        const match = String(data).match(/Listening on (\d+)/)
        if (match) {
          clearTimeout(timer)
          resolve(`http://127.0.0.1:${match[1]}`)
        }
      })
      child.on('exit', () => {
        clearTimeout(timer)
        reject(new Error('Server exited before listening'))
      })
    })
    assert.equal(
      await (
        await fetch(`${address}/products/fixture`, { headers: { Accept: 'text/html' } })
      ).text(),
      '<h1>SPA fixture</h1>'
    )
    assert.equal((await fetch(`${address}/assets/missing.js`)).status, 404)
    assert.equal((await fetch(`${address}/missing.css`)).status, 404)
    assert.equal(
      (await fetch(`${address}/missing`, { headers: { Accept: 'application/json' } })).status,
      404
    )
  } finally {
    child.kill()
    await rm(root, { recursive: true, force: true })
  }
})

test('mandatory database runner rejects absent and hosted configuration', () => {
  const { spawnSync } = require('node:child_process')
  for (const url of ['', 'https://example.supabase.co', 'http://localhost.evil.test:54321']) {
    const result = spawnSync(process.execPath, ['tests/run-local-integration.cjs'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_TEST_URL: url,
        SUPABASE_TEST_ANON_KEY: 'fixture',
        SUPABASE_TEST_SERVICE_ROLE_KEY: 'fixture',
        SUPABASE_TEST_ISOLATED_LOCAL: 'true',
      },
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /isolated local Supabase/)
  }
})

test('static server fails clearly when build is absent', async () => {
  const { readFile } = require('node:fs/promises')
  const { spawnSync } = require('node:child_process')
  const root = await mkdtemp(path.join(tmpdir(), 'muvira-missing-build-'))
  try {
    await mkdir(path.join(root, 'scripts'))
    const script = path.join(root, 'scripts/serve-static.mjs')
    await writeFile(script, await readFile(path.resolve('client/scripts/serve-static.mjs')))
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 2000 })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Static build missing/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('deployment redirects www to apex preserving full request URI', async () => {
  const { readFile } = require('node:fs/promises')
  const config = await readFile('client/nginx.conf', 'utf8')
  assert.match(
    config,
    /server_name www\.muvira\.in;\s+return 308 https:\/\/muvira\.in\$request_uri;/
  )
})
