const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtemp, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const test = require('node:test')
const http = require('node:http')
function request(url, host) {
  return new Promise((resolve, reject) => {
    http
      .get(url, { headers: { Host: host } }, (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () =>
          resolve({ status: response.statusCode, body, location: response.headers.location })
        )
      })
      .on('error', reject)
  })
}

// Explicit opt-in keeps offline unit tests independent of Docker availability.
test(
  'nginx serves apex and health probes while redirecting only www',
  { skip: process.env.RUN_NGINX_HOSTING_TEST !== 'true' },
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'muvira-nginx-'))
    let container
    const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim()
    try {
      await writeFile(path.join(root, 'index.html'), '<h1>Storefront fixture</h1>')
      container = docker(
        'run',
        '--rm',
        '-d',
        '-p',
        '127.0.0.1::80',
        '-v',
        `${path.resolve('client/nginx.conf')}:/etc/nginx/conf.d/default.conf:ro`,
        '-v',
        `${root}:/usr/share/nginx/html:ro`,
        'nginx:alpine'
      )
      const port = docker(
        'inspect',
        '--format',
        '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}',
        container
      )
      const address = `http://127.0.0.1:${port}`
      let ready = false
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          await fetch(address, { redirect: 'manual' })
          ready = true
          break
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      assert.equal(ready, true, 'nginx must become ready')
      const apex = await request(`${address}/products/example?source=check`, 'muvira.in')
      assert.equal(apex.status, 200, 'apex must serve SPA without a redirect loop')
      assert.match(apex.body, /Storefront fixture/)
      const health = await request(`${address}/healthz`, 'localhost')
      assert.equal(health.status, 200, 'localhost container probe must reach storefront')
      assert.equal(health.body, 'ok\n')
      const www = await request(`${address}/products/example?source=check`, 'www.muvira.in')
      assert.equal(www.status, 308)
      assert.equal(www.location, 'https://muvira.in/products/example?source=check')
    } finally {
      if (container) docker('rm', '-f', container)
      await rm(root, { recursive: true, force: true })
    }
  }
)
