const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const { join } = require('node:path')
const { chromium } = require('playwright')
const entry =
  "import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Link}from'react-router-dom';import{RouteSeo}from'/src/components/seo/RouteSeo.tsx';import{Pagination}from'/src/components/common/Pagination.tsx';function Pages(){const[page,setPage]=React.useState(1);return React.createElement(Pagination,{currentPage:page,totalPages:3,onPageChange:n=>{window.changedPage=n;setPage(n)},getPageHref:n=>'/shop?page='+n})};window.delay=700;createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,{},React.createElement(MemoryRouter,{initialEntries:['/product/ganesha']},React.createElement(RouteSeo),React.createElement(Pages),React.createElement(Link,{to:'/shop?q=shiva'},'Filter'),React.createElement(Link,{to:'/'},'Home'),React.createElement(Link,{to:'/product/ganesha'},'Product'),React.createElement(Link,{to:'/PRODUCT/ganesha/'},'Product variant'))));window.ready=true;"
let vite, browser, origin
before(async () => {
  const { createServer } = await import(
    pathToFileURL(join(__dirname, '../client/node_modules/vite/dist/node/index.js'))
  )
  vite = await createServer({
    root: join(__dirname, '../client'),
    configFile: false,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'seo-fixture',
        enforce: 'pre',
        resolveId(source) {
          if (source === '/fixture.js') return '\0fixture'
          if (source.endsWith('/api/client') || source === '../api/client') return '\0seo-api'
        },
        load(id) {
          if (id === '\0fixture') return entry
          if (id === '\0seo-api')
            return `export const api={get:async path=>{await new Promise(r=>setTimeout(r,window.delay||0));if(window.fail)throw new Error('offline');return {success:true,data:{name:'Ganesha resin idol',slug:'ganesha',short_description:'Resin idol.',is_active:true,price_paisa:12345,stock:0,sku:'GAN',product_images:[],categories:{name:'God Idols',slug:'god-idols'}}}}}`
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url.split('?')[0] !== '/') return next()
            res.setHeader('content-type', 'text/html')
            res.end(
              `<html><head><title data-seo>Initial title from host</title><meta data-seo name="robots" content="index, follow"><script id="seo-config" type="application/json">{"siteUrl":"https://muvira.in","indexingEnabled":true}</script><script id="seo-initial" type="application/json">{"route":"/product/ganesha","metadata":{}}</script></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await chromium.launch()
})
after(async () => {
  await browser?.close()
  await vite?.close()
})
test('one head owner preserves initial metadata during loading and clears stale schema on navigation', async () => {
  const page = await browser.newPage()
  page.on('pageerror', (error) => console.error(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text())
  })
  try {
    await page.goto(origin)
    await page.waitForFunction(() => window.ready, {}, { timeout: 5000 })
    assert.equal(await page.title(), 'Initial title from host')
    await page.waitForFunction(() => document.title.includes('Ganesha resin idol'))
    assert.equal(await page.locator('head title').count(), 1)
    assert.equal(await page.locator('head meta[name="description"]').count(), 1)
    assert.equal(await page.locator('head script[type="application/ld+json"]').count(), 1)
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await page.waitForFunction(() => document.title.includes('Buy God Idols'))
    assert.doesNotMatch(
      await page.locator('head script[type="application/ld+json"]').textContent(),
      /'@type':'Product'|"@type":"Product"/
    )
    await page.getByRole('link', { name: 'Product', exact: true }).click()
    await page.waitForFunction(() => document.title.includes('Ganesha resin idol'))
    await page.getByRole('link', { name: 'Product variant', exact: true }).click()
    await page.waitForFunction(
      () =>
        document.title.includes('Ganesha resin idol') &&
        document.querySelector('link[rel="canonical"]')?.href ===
          'https://muvira.in/product/ganesha'
    )
    await page.getByRole('link', { name: 'Filter', exact: true }).click()
    await page.waitForFunction(
      () => document.querySelector('meta[name="robots"]')?.content === 'noindex, follow'
    )
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute('content'),
      'noindex, follow'
    )
    assert.doesNotMatch(
      await page.locator('head script[type="application/ld+json"]').textContent(),
      /"@type":"Product"/
    )
  } finally {
    await page.close()
  }
})

test('crawlable pagination keeps modified clicks native and ordinary clicks in the app', async () => {
  const page = await browser.newPage()
  try {
    await page.goto(origin)
    await page.getByRole('link', { name: 'Go to page 2', exact: true }).waitFor()
    const link = page.getByRole('link', { name: 'Go to page 2', exact: true })
    assert.equal(await link.getAttribute('href'), '/shop?page=2')
    const popupPromise = page.context().waitForEvent('page', { timeout: 5000 })
    await link.click({ modifiers: ['ControlOrMeta'] })
    const popup = await popupPromise
    await popup.close()
    assert.equal(await page.evaluate(() => window.changedPage), undefined)
    await link.click()
    await page.waitForFunction(() => window.changedPage === 2)
    assert.equal(
      await page
        .getByRole('link', { name: 'Go to page 2', exact: true })
        .getAttribute('aria-current'),
      'page'
    )
  } finally {
    await page.close()
  }
})
