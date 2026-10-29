import { chromium, webkit } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startEditorialServer } from './editorial-server.mjs'

const output = resolve('responsive-audit/redesign/journey')
await mkdir(output, { recursive: true })
const { server, origin } = await startEditorialServer()
const routes = [
  ['profile', '/profile'],
  ['personal', '/profile#personal-info'],
  ['addresses', '/profile#addresses'],
  ['cart', '/cart'],
  ['shipping', '/checkout'],
  ['payment', '/checkout?step=payment'],
  ['orders', '/orders'],
  ['detail', '/orders/fixture-order'],
  ['confirmation', '/orders/success?orderId=fixture-order'],
  ['pending', '/orders/success?orderId=fixture-order&payment=pending'],
  ['failure', '/orders/failure'],
  ['tracking', '/orders/fixture-order/tracking?shipment=1'],
]
const results = [],
  images = new Map()
try {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch()
    try {
      for (const width of [320, 390, 768, 1280, 1440])
        for (const scale of [1, 2])
          for (const [name, path] of routes) {
            const page = await browser.newPage({
              viewport: { width, height: 950 },
              reducedMotion: 'reduce',
            })
            const result = { engine, width, scale, name, errors: [] }
            page.on('pageerror', (error) => result.errors.push(error.message))
            await page.route('**/*', async (route) => {
              const url = new URL(route.request().url())
              if (url.pathname.includes('unavailable-journey')) return route.abort()
              if (url.origin === origin) return route.continue()
              if (route.request().resourceType() === 'image') {
                if (!images.has(url.href))
                  images.set(
                    url.href,
                    fetch(url.href).then(async (r) => ({
                      body: Buffer.from(await r.arrayBuffer()),
                      contentType: r.headers.get('content-type') || 'image/jpeg',
                    }))
                  )
                return route.fulfill(await images.get(url.href))
              }
              if (url.hostname === 'checkout.razorpay.com')
                return route.fulfill({ contentType: 'application/javascript', body: '' })
              return route.abort()
            })
            try {
              await page.goto(origin + path)
              await page.locator('h1').waitFor()
              await page.evaluate(() => document.fonts.ready)
              if (name === 'tracking') await page.getByText('Picked up', { exact: true }).waitFor()
              if (name === 'profile')
                await page
                  .getByRole('region', { name: 'Recent order', exact: true })
                  .getByText('#MUV-2026-1042', { exact: true })
                  .waitFor()
              if (
                ['cart', 'shipping', 'payment', 'orders', 'detail', 'confirmation'].includes(name)
              )
                await page.locator('main img').first().waitFor()
              await page.evaluate(async () => {
                for (const image of document.images) image.loading = 'eager'
                await Promise.race([
                  Promise.allSettled([...document.images].map((image) => image.decode())),
                  new Promise((done) => setTimeout(done, 2500)),
                ])
              })
              await page.evaluate((scale) => {
                document.documentElement.style.fontSize = `${16 * scale}px`
                if (scale === 2) {
                  document
                    .querySelectorAll('.account-email')
                    .forEach(
                      (el) => (el.textContent = 'a-long-customer-address-for-review@example.test')
                    )
                  document
                    .querySelectorAll('.order-item-copy h3')
                    .forEach(
                      (el) =>
                        (el.textContent +=
                          ' — Handcrafted traditional piece for a meaningful home and thoughtful gifting')
                    )
                  document
                    .querySelectorAll('main img')
                    .forEach((el) => (el.src = '/unavailable-journey.png'))
                }
              }, scale)
              await page.waitForTimeout(100)
              result.findings = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
                headings: document.querySelectorAll('main h1').length,
                fields: [
                  ...document.querySelectorAll(
                    'main input:not([type=radio]):not([type=checkbox]),main textarea'
                  ),
                ]
                  .filter(
                    (el) =>
                      el.getBoundingClientRect().height &&
                      parseFloat(getComputedStyle(el).fontSize) < 16
                  )
                  .map((el) => el.id),
                outside: [
                  ...document.querySelectorAll('main a,main button,main input,main textarea'),
                ]
                  .filter((el) => {
                    const r = el.getBoundingClientRect()
                    return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1)
                  })
                  .map((el) => ({ text: el.textContent.slice(0, 40), id: el.id })),
              }))
              const nav = page.getByRole('navigation', { name: 'Your account', exact: true })
              if (await nav.count()) {
                await nav.getByRole('link').last().focus()
                result.keyboard = await nav
                  .getByRole('link')
                  .last()
                  .evaluate((el) => document.activeElement === el)
                await page.evaluate(() => scrollTo(0, 0))
              }
              result.screenshot = `${engine}-${name}-${width}-text${scale}.png`
              await page.screenshot({ path: resolve(output, result.screenshot), fullPage: true })
            } catch (error) {
              result.error = error.message
            }
            results.push(result)
            await page.close()
          }
    } finally {
      await browser.close()
    }
  }
} finally {
  await server.close()
  await writeFile(
    resolve(output, 'findings.json'),
    JSON.stringify({ routes: routes.length, results }, null, 2)
  )
}
const failures = results.filter(
  (r) =>
    r.error ||
    r.errors.length ||
    r.findings?.overflow ||
    r.findings?.headings !== 1 ||
    r.findings?.fields.length ||
    r.findings?.outside.length ||
    r.keyboard === false
)
console.log(JSON.stringify({ views: results.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
