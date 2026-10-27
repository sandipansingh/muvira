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
  const { createFrontendServer } = await import(
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
              ? categories
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
    siteUrl: config.siteUrl,
    indexingEnabled: true,
    apiUrl: `http://127.0.0.1:${api.address().port}`,
    token: 'private-fixture',
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
  assert.equal(seenToken, 'private-fixture')
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

test('runtime settings reject credential-bearing origins and keep indexing opt in', async () => {
  const { runtimeConfig } = await import(
    pathToFileURL(path.resolve('client/scripts/frontend-host.mjs'))
  )
  const environment = { SEO_API_URL: 'https://api.example', SEO_INTERNAL_TOKEN: 's'.repeat(32) }
  assert.equal(runtimeConfig(environment).indexingEnabled, false)
  for (const invalid of [
    { SITE_URL: 'http://muvira.in' },
    { SEO_API_URL: 'https://secret@api.example' },
    { SEO_API_URL: 'https://api.example/api' },
    { SEO_INTERNAL_TOKEN: 'short' },
    { SEO_INDEXING_ENABLED: 'yes' },
  ])
    assert.throws(() => runtimeConfig({ ...environment, ...invalid }))
})

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
