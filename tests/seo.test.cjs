const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const load = () => import(pathToFileURL(path.resolve('client/src/lib/seo/metadata.mjs')))
const product = {
  name: 'Ganesha marble-finish resin idol',
  slug: 'ganesha',
  short_description: 'A marble-finish resin Ganesha for your home temple.',
  price_paisa: 129950,
  stock: 0,
  sku: 'GAN-1',
  is_active: true,
  product_images: [{ url: 'https://images.example/ganesha.jpg', is_primary: true }],
  categories: { name: 'God Idols', slug: 'god-idols' },
}
const config = { siteUrl: 'https://muvira.in', indexingEnabled: true }
function assertIndexableHtml(response, html, canonical) {
  assert.equal(response.status, 200, canonical)
  assert.equal(response.headers.get('x-robots-tag'), 'index, follow', `${canonical}: HTTP robots`)
  assert.match(
    html,
    /<meta[^>]*name="robots"[^>]*content="index, follow"/,
    `${canonical}: HTML robots`
  )
  const runtime = html.match(/<script id="seo-config"[^>]*>(.*?)<\/script>/s)
  assert.ok(runtime, `${canonical}: public runtime configuration`)
  assert.deepEqual(JSON.parse(runtime[1]), config, `${canonical}: production indexing enabled`)
  const link = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)
  assert.equal(link?.[1].replaceAll('&amp;', '&'), canonical)
}
test('home copy, product price, stock and overrides use verified catalog facts', async () => {
  const { buildMetadata } = await load()
  assert.equal(
    buildMetadata('/', {}, config).title,
    'Buy God Idols & Puja Decor Online in India | Muvira'
  )
  const meta = buildMetadata('/product/ganesha', { product }, config)
  const schema = meta.schemas.find((x) => x['@type'] === 'Product')
  assert.equal(schema.offers.price, '1299.50')
  assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock')
  assert.equal(meta.robots, 'index, follow')
  assert.equal(schema.aggregateRating, undefined)
  assert.match(meta.description, /marble-finish resin/)
  assert.equal(
    buildMetadata(
      '/product/ganesha',
      {
        product: {
          ...product,
          meta_title: ' Custom title ',
          meta_description: ' Custom description ',
          tags: ['Ganesha'],
        },
      },
      config
    ).title,
    'Custom title'
  )
})
test('canonicals retain ordinary pages and noindex filters, empty/error/private pages', async () => {
  const { buildMetadata } = await load()
  const cat = {
    name: 'God Idols',
    slug: 'god-idols',
    description: 'Explore god idols for home temples.',
  }
  assert.equal(
    buildMetadata('/shop?category=god-idols&page=2', { category: cat, total: 30 }, config)
      .canonical,
    'https://muvira.in/shop?category=god-idols&page=2'
  )
  for (const route of [
    '/search?q=ganesha',
    '/shop?category=god-idols&sort=newest',
    '/shop?q=ganesha',
    '/admin/catalog',
    '/checkout',
    '/missing',
  ])
    assert.equal(
      buildMetadata(route, { category: cat, total: 30 }, config).robots,
      'noindex, follow',
      route
    )
  assert.equal(
    buildMetadata('/shop?category=god-idols', { category: cat, total: 0 }, config).robots,
    'noindex, follow'
  )
  assert.equal(
    buildMetadata('/', {}, { ...config, indexingEnabled: false }).robots,
    'noindex, follow'
  )
})
test('head escapes HTML and script breaking text, includes one complete tag set', async () => {
  const { buildMetadata, renderHead } = await load()
  const head = renderHead(
    buildMetadata(
      '/product/ganesha',
      {
        product: {
          ...product,
          meta_title: '"</title><script>bad()</script>',
          short_description: '</script><img src=x onerror=bad()>',
        },
      },
      config
    )
  )
  assert.doesNotMatch(head, /<script>bad/)
  assert.doesNotMatch(head, /<img src=x/)
  assert.equal((head.match(/<title/g) || []).length, 1)
  assert.match(head, /twitter:card/)
  assert.match(head, /og:locale/)
  assert.match(head, /https:\/\/images.example\/ganesha.jpg/)
  assert.doesNotMatch(head, /og:image:width/)
})
test('route resolver distinguishes missing records from outages and preserves alias filters', async () => {
  const { resolvePage } = await load()
  const missing = async () => {
    const e = new Error('missing')
    e.status = 404
    throw e
  }
  assert.equal((await resolvePage('/product/missing', missing, config)).status, 404)
  assert.equal(
    (
      await resolvePage(
        '/product/ganesha',
        async () => {
          throw new Error('offline')
        },
        config
      )
    ).status,
    503
  )
  assert.equal(
    (await resolvePage('/categories/god-idols?page=2&inStock=true', missing, config)).redirect,
    '/shop?category=god-idols&page=2&inStock=true'
  )
})
test('frontend raw HTML, sitemap, redirects, health and upstream isolation', async (t) => {
  const { createServer } = require('node:http')
  const { createFrontendServer, runtimeConfig } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises')
  const { tmpdir } = require('node:os')
  let mode = 'ok',
    seenToken
  let redirectRequests = 0
  let catalogPrice = product.price_paisa
  let catalogStock = product.stock
  const api = createServer((req, res) => {
    seenToken = req.headers['x-muvira-seo-token']
    if (req.url === '/steal') redirectRequests++
    if (mode === 'redirect' && req.url !== '/steal') {
      res.writeHead(302, { Location: '/steal' })
      res.end()
      return
    }
    if (mode === 'outage') {
      res.writeHead(500)
      res.end()
      return
    }
    if (req.url.includes('/missing')) {
      res.writeHead(404)
      res.end()
      return
    }
    res.setHeader('Content-Type', 'application/json')
    const categories = [
      {
        id: 'c1',
        name: 'God Idols',
        slug: 'god-idols',
        is_active: true,
        updated_at: '2026-10-01T00:00:00Z',
      },
      { id: 'empty', name: 'Empty', slug: 'empty', is_active: true },
    ]
    res.end(
      JSON.stringify({
        success: true,
        data:
          mode === 'empty'
            ? []
            : req.url.startsWith('/api/categories')
              ? req.url.startsWith('/api/categories/')
                ? categories.find((category) => req.url === `/api/categories/${category.slug}`)
                : categories
              : req.url.startsWith('/api/products?')
                ? [{ ...product, category_id: 'c1', updated_at: '2026-10-02T00:00:00Z' }]
                : { ...product, price_paisa: catalogPrice, stock: catalogStock },
        meta: {
          total: mode === 'empty' ? 0 : 1,
          totalPages: mode === 'empty' ? 0 : 1,
          page: 1,
          limit: 100,
        },
      })
    )
  })
  await new Promise((r) => api.listen(0, '127.0.0.1', r))
  const root = await mkdtemp(path.join(tmpdir(), 'muvira-seo-'))
  await mkdir(path.join(root, 'assets'))
  await writeFile(
    path.join(root, 'index.html'),
    '<html><head><!-- SEO_HEAD --></head><body><div id="root"></div></body></html>'
  )
  await writeFile(path.join(root, 'assets/app.js'), 'console.log("ok")')
  const server = createFrontendServer({
    distRoot: root,
    ...runtimeConfig({
      SITE_URL: config.siteUrl,
      SEO_INDEXING_ENABLED: 'true',
      SEO_API_URL: `http://127.0.0.1:${api.address().port}`,
      SEO_INTERNAL_TOKEN: 'private-fixture'.repeat(3),
    }),
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  t.after(async () => {
    server.closeAllConnections()
    api.closeAllConnections()
    await Promise.all([new Promise((r) => server.close(r)), new Promise((r) => api.close(r))])
    await rm(root, { recursive: true, force: true })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  const html = await (await fetch(`${origin}/product/ganesha`)).text()
  assert.match(html, /<title data-seo>/)
  assert.match(html, /1299.50/)
  assert.doesNotMatch(html, /private-fixture/)
  assert.equal(seenToken, 'private-fixture'.repeat(3))
  catalogPrice = 9900
  catalogStock = 8
  const fresh = await (await fetch(`${origin}/product/ganesha`)).text()
  assert.match(fresh, /99.00/)
  assert.match(fresh, /https:\/\/schema.org\/InStock/)
  catalogPrice = product.price_paisa
  catalogStock = product.stock
  assert.equal((await fetch(`${origin}/product/missing`)).status, 404)
  mode = 'outage'
  const outage = await fetch(`${origin}/product/ganesha`)
  assert.equal(outage.status, 503)
  assert.equal(outage.headers.get('retry-after'), '60')
  mode = 'redirect'
  assert.equal((await fetch(`${origin}/product/ganesha`)).status, 503)
  assert.equal(redirectRequests, 0)
  mode = 'ok'
  const sitemap = await fetch(`${origin}/sitemap.xml`)
  assert.match(sitemap.headers.get('content-type'), /xml/)
  const xml = await sitemap.text()
  assert.match(xml, /product\/ganesha/)
  assert.match(xml, /category=god-idols/)
  assert.doesNotMatch(xml, /category=empty/)
  assert.match(xml, /2026-10-02/)
  mode = 'empty'
  const emptyXml = await (await fetch(`${origin}/sitemap.xml`)).text()
  assert.doesNotMatch(emptyXml, /\/shop|\/categories|\/product\//)
  mode = 'ok'
  assert.match(
    await (await fetch(`${origin}/robots.txt`)).text(),
    /Sitemap: https:\/\/muvira.in\/sitemap.xml/
  )
  assert.equal(await (await fetch(`${origin}/healthz`)).text(), 'ok\n')
  assert.equal(
    (await fetch(`${origin}/assets/app.js`)).headers.get('cache-control'),
    'public, max-age=31536000, immutable'
  )
  assert.equal((await fetch(`${origin}/assets/no.js`)).status, 404)
  const alias = await fetch(`${origin}/category/god-idols?page=2`, { redirect: 'manual' })
  assert.equal(alias.status, 308)
  assert.equal(alias.headers.get('location'), '/shop?category=god-idols&page=2')
  const www = await new Promise((resolve, reject) => {
    const req = require('node:http').get(
      `${origin}/shop?page=2`,
      { headers: { Host: 'www.muvira.in' } },
      (res) => {
        res.resume()
        resolve(res)
      }
    )
    req.on('error', reject)
  })
  assert.equal(www.headers.location, 'https://muvira.in/shop?page=2')
  for (const route of ['/', '/shop', '/product/ganesha', '/shop?category=god-idols']) {
    const response = await fetch(origin + route)
    assertIndexableHtml(response, await response.text(), config.siteUrl + route)
  }
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ javaScriptEnabled: false })
    await page.goto(`${origin}/product/ganesha`)
    assert.match(await page.title(), /Ganesha marble-finish resin/)
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://muvira.in/product/ganesha'
    )
  } finally {
    await browser.close()
  }
})

test('runtime settings reject credential-bearing origins', async () => {
  const { runtimeConfig } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const environment = {
    SEO_API_URL: 'https://api.example',
    SEO_INTERNAL_TOKEN: 's'.repeat(32),
    SEO_INDEXING_ENABLED: 'true',
  }
  for (const invalid of [
    { SITE_URL: 'http://muvira.in' },
    { SEO_API_URL: 'https://secret@api.example' },
    { SEO_API_URL: 'https://api.example/api' },
    { SEO_INTERNAL_TOKEN: 'short' },
  ])
    assert.throws(() => runtimeConfig({ ...environment, ...invalid }))
})

test('runtime indexing requires an explicit true or false', async () => {
  const { runtimeConfig } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const environment = { SEO_API_URL: 'https://api.example', SEO_INTERNAL_TOKEN: 's'.repeat(32) }
  assert.throws(() => runtimeConfig(environment), /SEO_INDEXING_ENABLED/)
  for (const value of ['', ' ', 'yes', 'TRUE', 'FALSE', '1', '0', ' true', 'false ', true, false])
    assert.throws(
      () => runtimeConfig({ ...environment, SEO_INDEXING_ENABLED: value }),
      /SEO_INDEXING_ENABLED/,
      String(value)
    )
  for (const [value, expected] of [
    ['true', true],
    ['false', false],
  ])
    assert.equal(
      runtimeConfig({ ...environment, SEO_INDEXING_ENABLED: value }).indexingEnabled,
      expected
    )
})

test('Compose refuses omitted or empty indexing and passes explicit true and false', (t) => {
  const { spawnSync } = require('node:child_process')
  const { readFileSync } = require('node:fs')
  if (spawnSync('docker', ['compose', 'version']).status !== 0) {
    t.skip('Docker Compose CLI is required for configuration validation')
    return
  }
  const environment = { ...process.env }
  for (const match of readFileSync('docker-compose.yml', 'utf8').matchAll(/\$\{([A-Z][A-Z0-9_]*)/g))
    environment[match[1]] = 'fixture'
  for (const value of [undefined, '', 'true', 'false']) {
    const env = { ...environment }
    delete env.SEO_INDEXING_ENABLED
    if (value !== undefined) env.SEO_INDEXING_ENABLED = value
    const result = spawnSync(
      'docker',
      [
        'compose',
        '--env-file',
        '/dev/null',
        '-f',
        'docker-compose.yml',
        'config',
        '--format',
        'json',
      ],
      {
        env,
        encoding: 'utf8',
        timeout: 10000,
      }
    )
    if (value === undefined || value === '') {
      assert.notEqual(result.status, 0, `Indexing setting ${String(value)} must fail`)
      assert.match(result.stderr, /SEO_INDEXING_ENABLED/)
    } else {
      assert.equal(result.status, 0, result.stderr)
      assert.equal(
        JSON.parse(result.stdout).services.client.environment.SEO_INDEXING_ENABLED,
        value
      )
    }
  }
})

test('staging fails the production indexing check while health stays green', async (t) => {
  const { createFrontendServer, runtimeConfig } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const { mkdtemp, writeFile, rm } = require('node:fs/promises')
  const { tmpdir } = require('node:os')
  const root = await mkdtemp(path.join(tmpdir(), 'muvira-staging-seo-'))
  await writeFile(
    path.join(root, 'index.html'),
    '<html><head><!-- SEO_HEAD --></head><body></body></html>'
  )
  const server = createFrontendServer({
    ...runtimeConfig({
      SITE_URL: 'https://staging.example',
      SEO_API_URL: 'http://127.0.0.1:1',
      SEO_INTERNAL_TOKEN: 's'.repeat(32),
      SEO_INDEXING_ENABLED: 'false',
    }),
    distRoot: root,
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((r) => server.close(r))
    await rm(root, { recursive: true, force: true })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  assert.equal((await fetch(`${origin}/healthz`)).status, 200)
  const response = await fetch(origin)
  const html = await response.text()
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow')
  assert.match(html, /name="robots" content="noindex, follow"/)
  assert.match(html, /"indexingEnabled":false/)
  assert.throws(() => assertIndexableHtml(response, html, config.siteUrl + '/'), /HTTP robots/)
  assert.throws(
    () =>
      assertIndexableHtml(
        new Response(html, { headers: { 'X-Robots-Tag': 'index, follow' } }),
        html,
        config.siteUrl + '/'
      ),
    /HTML robots/
  )
  assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /User-agent: \*\nDisallow: \/\n/)
})

test(
  'production SEO smoke: public catalog remains indexable independently of liveness',
  {
    skip: process.env.SEO_PRODUCTION_SMOKE !== 'true',
    timeout: 180000,
  },
  async () => {
    const get = (url) =>
      fetch(url, {
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Googlebot' },
      })
    const origin = config.siteUrl
    assert.equal((await get(`${origin}/healthz`)).status, 200)
    const sitemap = await get(`${origin}/sitemap.xml`)
    assert.equal(sitemap.status, 200)
    assert.match(sitemap.headers.get('content-type'), /xml/)
    const xml = await sitemap.text()
    const { chromium } = require('playwright')
    const browser = await chromium.launch()
    let urls
    try {
      const page = await browser.newPage()
      urls = await page.evaluate((xml) => {
        const document = new DOMParser().parseFromString(xml, 'application/xml')
        if (
          document.querySelector('parsererror') ||
          document.documentElement.localName !== 'urlset'
        )
          throw new Error('Invalid sitemap XML')
        return [...document.querySelectorAll('url > loc')].map((loc) => loc.textContent)
      }, xml)
    } finally {
      await browser.close()
    }
    assert.ok(urls.length > 0)
    for (const url of urls) assert.equal(new URL(url).origin, origin)
    const productUrl = urls.find((url) => new URL(url).pathname.startsWith('/product/'))
    const collectionUrl = urls.find(
      (url) => new URL(url).pathname === '/shop' && new URL(url).searchParams.has('category')
    )
    assert.ok(productUrl, 'Sitemap must include an active product')
    assert.ok(collectionUrl, 'Sitemap must include an active collection')
    for (const url of [origin + '/', origin + '/shop', productUrl, collectionUrl]) {
      const response = await get(url)
      assertIndexableHtml(response, await response.text(), url)
    }
    const robots = await (await get(`${origin}/robots.txt`)).text()
    // Cloudflare can append training-crawler exclusions; inspect Google's matching groups.
    const groups = robots.split(/\r?\n\s*\r?\n/).map((group) => group.replace(/^#.*$/gm, '').trim())
    const googleGroups = groups.filter((group) =>
      /^User-agent:\s*(?:\*|Googlebot)\s*$/im.test(group)
    )
    assert.ok(googleGroups.length > 0, 'Robots must allow Google crawling')
    for (const group of googleGroups) assert.doesNotMatch(group, /^Disallow:\s*\/\s*$/im)
    assert.match(robots, /Sitemap: https:\/\/muvira\.in\/sitemap\.xml/)
    for (const route of [
      '/checkout',
      '/profile',
      '/admin',
      '/search?q=ganesha',
      '/shop?sort=newest',
    ]) {
      const response = await get(origin + route)
      assert.equal(response.status, 200, route)
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow', route)
      assert.match(await response.text(), /name="robots" content="noindex, follow"/, route)
    }
    const redirect = await fetch(
      'https://www.muvira.in/shop?category=god-idols&utm_source=seo-check',
      {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      }
    )
    assert.equal(redirect.status, 308)
    assert.equal(
      redirect.headers.get('location'),
      origin + '/shop?category=god-idols&utm_source=seo-check'
    )
  }
)

test('malformed success responses become outages without invented price or empty catalog', async () => {
  const { resolvePage } = await load()
  for (const invalid of [
    { ...product, price_paisa: undefined },
    { ...product, stock: 'unknown' },
    { ...product, product_images: [null] },
  ]) {
    assert.equal(
      (
        await resolvePage(
          '/product/ganesha',
          async () => ({ success: true, data: invalid }),
          config
        )
      ).status,
      503
    )
  }
  assert.equal(
    (
      await resolvePage(
        '/shop?category=broken',
        async () => ({ success: true, data: null }),
        config
      )
    ).status,
    503
  )
})

test('trailing slash routes redirect to the existing canonical destination', async () => {
  const { resolvePage } = await load()
  assert.equal(
    (
      await resolvePage(
        '/product/ganesha/?utm_source=test',
        async () => {
          throw Error('unneeded')
        },
        config
      )
    ).redirect,
    '/product/ganesha?utm_source=test'
  )
  assert.equal(
    (
      await resolvePage(
        '/shop/?category=god-idols',
        async () => {
          throw Error('unneeded')
        },
        config
      )
    ).redirect,
    '/shop?category=god-idols'
  )
})
test('collection directory is noindex when empty and 503 during an upstream failure', async () => {
  const { resolvePage } = await load()
  assert.equal(
    (await resolvePage('/categories', async () => ({ data: [] }), config)).metadata.robots,
    'noindex, follow'
  )
  assert.equal(
    (
      await resolvePage(
        '/categories',
        async () => {
          throw Error('offline')
        },
        config
      )
    ).status,
    503
  )
})

test('route matching and filter defaults agree with the client router', async () => {
  const { resolvePage } = await load()
  assert.equal(
    (
      await resolvePage(
        '/SHOP?category=idols',
        async () => {
          throw Error('unused')
        },
        config
      )
    ).redirect,
    '/shop?category=idols'
  )
  let requested
  const result = await resolvePage(
    '/shop?sort=bogus&inStock=bogus',
    async (path) => {
      requested = path
      return { data: [], meta: { total: 1, totalPages: 1 } }
    },
    config
  )
  assert.equal(result.status, 200)
  assert.doesNotMatch(requested, /bogus/)
  assert.equal(result.metadata.robots, 'noindex, follow')
  const invalid = await resolvePage(
    '/shop?minPrice=bogus',
    async () => {
      throw Error('must not fetch')
    },
    config
  )
  assert.equal(invalid.status, 400)
})

test('compression honors an explicit gzip exclusion', async (t) => {
  const { createFrontendServer } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const { mkdtemp, writeFile, rm } = require('node:fs/promises')
  const { tmpdir } = require('node:os')
  const root = await mkdtemp(path.join(tmpdir(), 'muvira-gzip-'))
  await writeFile(
    path.join(root, 'index.html'),
    '<html><head><!-- SEO_HEAD --></head><body></body></html>'
  )
  const server = createFrontendServer({
    distRoot: root,
    ...config,
    apiUrl: 'http://127.0.0.1:1',
    token: 'fixture',
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((r) => server.close(r))
    await rm(root, { recursive: true, force: true })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  assert.equal(
    (await fetch(origin, { headers: { 'Accept-Encoding': 'gzip;q=0, identity' } })).headers.get(
      'content-encoding'
    ),
    null
  )
  assert.equal(
    (await fetch(origin, { headers: { 'Accept-Encoding': 'gzip' } })).headers.get(
      'content-encoding'
    ),
    'gzip'
  )
})
