import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startEditorialServer } from './editorial-server.mjs'

const output = resolve('responsive-audit/redesign')
await mkdir(output, { recursive: true })
const { server, origin } = await startEditorialServer()
const browser = await chromium.launch({ headless: true })
const routes = [
  ['home', '/'],
  ['shop', '/shop'],
  ['categories', '/categories'],
  ['search', '/search?q=Krishna'],
  ['product', '/product/fixture'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['payment', '/checkout?step=payment'],
  ['signin', '/signin?fixtureRole=guest'],
  ['signup', '/signup?fixtureRole=guest'],
  ['recovery', '/reset-password'],
  ['profile', '/profile'],
  ['profile-personal', '/profile#personal-info'],
  ['profile-addresses', '/profile#addresses'],
  ['orders', '/orders'],
  ['order-detail', '/orders/fixture-order'],
  ['order-tracking', '/orders/fixture-order/tracking?shipment=1'],
  ['order-invoice', '/orders/fixture-order?shipment=1'],
  ['order-success', '/orders/success?orderId=fixture-order'],
  ['order-pending', '/orders/success?orderId=fixture-order&payment=pending'],
  ['order-failure', '/orders/failure'],
  ['not-found', '/missing'],
  ['admin-dashboard', '/admin?fixtureRole=admin'],
  ['admin-orders', '/admin/orders?fixtureRole=admin'],
  ['admin-order-detail', '/admin/orders/fixture-order?fixtureRole=admin'],
  ['admin-catalog', '/admin/catalog?fixtureRole=admin'],
  ['admin-coupons', '/admin/coupons?fixtureRole=admin'],
  ['admin-settings', '/admin/settings?fixtureRole=admin'],
  ['admin-failures', '/admin/failures?fixtureRole=admin'],
  ['product-one-photo', '/product/fixture?photos=1'],
  ['product-two-photos', '/product/fixture?photos=2'],
  ['product-four-photos', '/product/fixture?photos=4'],
  ['product-many-photos', '/product/fixture?photos=10'],
  ['categories-empty', '/categories?scenario=empty'],
  ['categories-error', '/categories?scenario=error'],
  ['home-sparse', '/?scenario=sparse'],
  ['home-unknown-collections', '/?scenario=unknown-collections'],
  ['home-loading', '/?scenario=loading'],
  ['home-error', '/?scenario=error'],
  ['home-empty', '/?scenario=empty'],
  ['home-unconfigured', '/?scenario=unconfigured'],
  ['home-campaigns', '/?campaigns=1'],
  ['home-unknown-photo', '/?hero=unknown'],
  ['home-long-title', '/?hero=long'],
  ['shop-empty', '/shop?scenario=empty'],
  ['shop-error', '/shop?scenario=error'],
  ['shop-missing-images', '/shop?scenario=missing-images'],
  ['shop-long-name', '/shop?scenario=long-name'],
]
const viewports = [
  { width: 390, height: 844, label: 'mobile' },
  { width: 820, height: 1180, label: 'tablet' },
  { width: 1440, height: 1000, label: 'desktop' },
  { width: 320, height: 800, label: 'text-200', textScale: 2 },
  { width: 1280, height: 900, label: 'desktop-text-200', textScale: 2 },
]
const results = [],
  images = new Map()
const filter = process.env.EDITORIAL_ROUTE
try {
  for (const viewport of viewports) {
    for (const [name, path] of routes.filter(([name]) => !filter || name.includes(filter))) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      })
      const errors = [],
        blocked = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', async (route) => {
        const req = route.request(),
          url = new URL(req.url())
        if (url.origin === origin) return route.continue()
        if (url.origin === 'https://checkout.razorpay.com' && url.pathname === '/v1/razorpay.js') {
          // Exercise provider-unavailable UI without loading a live payment SDK.
          return route.fulfill({ contentType: 'application/javascript', body: '' })
        }
        if (req.resourceType() === 'image' && url.hostname.endsWith('.supabase.co')) {
          if (!images.has(req.url()))
            images.set(
              req.url(),
              fetch(req.url()).then(async (r) => ({
                body: Buffer.from(await r.arrayBuffer()),
                contentType: r.headers.get('content-type') || 'image/jpeg',
              }))
            )
          return route.fulfill(await images.get(req.url()))
        }
        blocked.push(req.url())
        return route.abort()
      })
      try {
        await page.goto(origin + path)
        await page.waitForFunction(() => window.fixtureReady)
        await page.locator('h1').first().waitFor({ timeout: 15000 })
        await page.evaluate(() => document.fonts.ready)
        if (viewport.textScale)
          await page.evaluate(
            (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
            viewport.textScale
          )
        await page.waitForTimeout(350)
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager'
          await Promise.race([
            Promise.allSettled([...document.images].map((image) => image.decode())),
            new Promise((done) => setTimeout(done, 3000)),
          ])
        })
        await page.locator('h1').first().waitFor({ timeout: 15000 })
        const findings = await page.evaluate(() => {
          const visible = (el) => {
            const r = el.getBoundingClientRect(),
              s = getComputedStyle(el)
            return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'
          }
          return {
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            headings: document.querySelectorAll('h1').length,
            smallFields: [
              ...document.querySelectorAll(
                'input:not([type=checkbox]):not([type=radio]),select,textarea'
              ),
            ]
              .filter(visible)
              .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
              .map((el) => el.id || el.name),
            heading: document.querySelector('h1')?.textContent,
            bodyFont: getComputedStyle(document.body).fontFamily,
          }
        })
        const screenshot = `${name}-${viewport.label}.png`
        await page.screenshot({ path: resolve(output, screenshot), fullPage: true })
        results.push({ name, path, viewport, screenshot, findings, errors, blocked })
        console.log(
          `${name} ${viewport.label}: ${findings.horizontalOverflow ? 'OVERFLOW' : 'ok'}${errors.length ? ' ERRORS ' + errors.join(';') : ''}`
        )
      } catch (error) {
        results.push({ name, path, viewport, error: error.message, errors, blocked })
        console.log(`${name} ${viewport.label}: ${error.message.split('\n')[0]}`)
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await browser.close()
  await server.close()
}
await writeFile(
  resolve(output, 'authenticated-findings.json'),
  JSON.stringify({ routes, viewports, results }, null, 2)
)
const failures = results.filter(
  (r) =>
    r.error ||
    r.errors.length ||
    r.blocked.length ||
    r.findings.horizontalOverflow ||
    r.findings.headings !== 1 ||
    r.findings.smallFields.length
)
console.log(
  JSON.stringify(
    {
      screens: results.length,
      failures: failures.map((r) => ({
        name: r.name,
        viewport: r.viewport.label,
        error: r.error,
        findings: r.findings,
        errors: r.errors,
        blocked: r.blocked,
      })),
    },
    null,
    2
  )
)
if (failures.length) process.exitCode = 1
